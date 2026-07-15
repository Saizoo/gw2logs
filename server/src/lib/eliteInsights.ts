import { spawn } from 'node:child_process';
import { mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

// Self-contained single-file publish -> run the executable directly
// (EI_DLL_PATH unset). Framework-dependent publish -> EI_COMMAND=dotnet,
// EI_DLL_PATH=path/to/GW2EIParserCLI.dll.
const EI_COMMAND = process.env.EI_COMMAND ?? '/opt/ei/ei-cli';
const EI_DLL = process.env.EI_DLL_PATH;
const EI_CONFIG = process.env.EI_CONFIG_PATH ?? '/opt/ei/settings.conf';
// A 160MB raid log takes meaningfully longer to parse than the small
// fixtures this was originally tuned against — keep in lockstep with
// nginx's proxy_read_timeout in deploy/nginx.conf.template.
const EI_TIMEOUT_MS = 300_000;
const MAX_CONCURRENT_PARSES = 2;

// A modest VPS can't usefully run more than a couple of EI processes (each
// is a full .NET parse) at once — extra uploads queue instead of piling on.
let activeParses = 0;
const waiters: (() => void)[] = [];

async function acquireSlot(): Promise<() => void> {
  if (activeParses >= MAX_CONCURRENT_PARSES) {
    await new Promise<void>((resolve) => waiters.push(resolve));
  }
  activeParses++;
  return () => {
    activeParses--;
    const next = waiters.shift();
    if (next) next();
  };
}

export interface EliteInsightsResult {
  json: Record<string, any>;
}

export async function parseWithEliteInsights(fileBuffer: Buffer, originalFileName: string): Promise<EliteInsightsResult> {
  const release = await acquireSlot();
  const dir = await mkdtemp(path.join(tmpdir(), 'ei-'));
  try {
    const ext = path.extname(originalFileName) || '.zevtc';
    const inputPath = path.join(dir, `log${ext}`);
    await writeFile(inputPath, fileBuffer);

    const args = [...(EI_DLL ? [EI_DLL] : []), '-c', EI_CONFIG, inputPath];
    await runProcess(EI_COMMAND, args, EI_TIMEOUT_MS);

    const entries = await readdir(dir);
    const jsonFile = entries.find((f) => f.endsWith('.json'));
    if (!jsonFile) {
      throw new Error(`Elite Insights produced no JSON output (files in temp dir: ${entries.join(', ') || 'none'})`);
    }
    const raw = await readFile(path.join(dir, jsonFile), 'utf8');
    return { json: JSON.parse(raw) };
  } finally {
    await rm(dir, { recursive: true, force: true });
    release();
  }
}

function runProcess(cmd: string, args: string[], timeoutMs: number): Promise<void> {
  return new Promise((resolve, reject) => {
    // Elite Insights needs HOME resolvable (see Dockerfile) to compute a
    // local-app-data folder during startup; fall back defensively in case
    // the process environment ever lacks it despite the container setting.
    const env = { ...process.env, HOME: process.env.HOME || '/root' };
    const child = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'], env });
    let stderr = '';
    child.stderr.on('data', (d) => {
      stderr += d.toString();
    });
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      reject(new Error(`Elite Insights timed out after ${timeoutMs}ms`));
    }, timeoutMs);
    child.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
    child.on('exit', (code) => {
      clearTimeout(timer);
      if (code === 0) resolve();
      else reject(new Error(`Elite Insights exited with code ${code}: ${stderr.slice(0, 1000)}`));
    });
  });
}

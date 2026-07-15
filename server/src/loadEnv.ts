// Must be imported before any module reads process.env (e.g. db.ts's
// PrismaClient). Docker/production sets real env vars directly and won't
// have a .env file, so a missing file here is expected, not an error.
try {
  process.loadEnvFile();
} catch {
  // no .env file present — fine when env vars are injected by the platform
}

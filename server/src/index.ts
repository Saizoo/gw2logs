import './loadEnv.js';
import express from 'express';
import cors from 'cors';
import { prisma } from './db.js';
import { uploadsRouter } from './routes/uploads.js';
import { encountersRouter } from './routes/encounters.js';
import { playersRouter } from './routes/players.js';
import { logsRouter } from './routes/logs.js';
import { searchRouter } from './routes/search.js';
import { compareRouter } from './routes/compare.js';

const app = express();
const port = Number(process.env.PORT ?? 4000);

app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.get('/api/stats', async (_req, res) => {
  const [totalLogs, totalPlayers] = await Promise.all([
    prisma.log.count(),
    prisma.player.count(),
  ]);
  res.json({ totalLogs, totalPlayers });
});

app.use('/api/uploads', uploadsRouter);
app.use('/api/encounters', encountersRouter);
app.use('/api/players', playersRouter);
app.use('/api/logs', logsRouter);
app.use('/api/search', searchRouter);
app.use('/api/compare', compareRouter);

app.listen(port, () => {
  console.log(`gw2logs API listening on :${port}`);
});

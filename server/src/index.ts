import './loadEnv.js';
import { createApp } from './app.js';
import { startReminderScheduler } from './lib/raidReminders.js';
import { startDpsReportSync } from './lib/dpsReportSync.js';

const port = Number(process.env.PORT ?? 4000);

createApp().listen(port, () => {
  console.log(`gw2logs API listening on :${port}`);
  startReminderScheduler();
  startDpsReportSync();
});

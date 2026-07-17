import { Router } from 'express';
import { asyncHandler } from '../../lib/asyncHandler.js';
import { CONFIG_DEFAULTS, getAllConfig, setConfig, type ConfigKey } from '../../lib/appConfig.js';
import { audit } from '../../lib/audit.js';

export const adminSettingsRouter = Router();

// Per-key validation — values are stored as strings but each key has a
// shape the rest of the app depends on.
const VALIDATORS: Record<ConfigKey, (value: string) => string | null> = {
  uploadsPaused: (v) => (v === 'true' || v === 'false' ? null : 'must be "true" or "false"'),
  inviteOnly: (v) => (v === 'true' || v === 'false' ? null : 'must be "true" or "false"'),
  defaultReminderMins: (v) => {
    const n = Number(v);
    return Number.isInteger(n) && n >= 5 && n <= 1440 ? null : 'must be an integer between 5 and 1440';
  },
};

adminSettingsRouter.get('/', asyncHandler(async (_req, res) => {
  res.json(await getAllConfig());
}));

adminSettingsRouter.put('/', asyncHandler(async (req, res) => {
  const key = typeof req.body?.key === 'string' ? req.body.key : '';
  const value = typeof req.body?.value === 'string' ? req.body.value : '';
  if (!(key in CONFIG_DEFAULTS)) {
    res.status(400).json({ error: `Unknown setting "${key}"` });
    return;
  }
  const problem = VALIDATORS[key as ConfigKey](value);
  if (problem) {
    res.status(400).json({ error: `${key} ${problem}` });
    return;
  }
  await setConfig(key as ConfigKey, value);
  audit(req.user!.id, 'setting_change', 'appConfig', key, { value });
  res.json(await getAllConfig());
}));

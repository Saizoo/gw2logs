import rateLimit from 'express-rate-limit';

// Per-IP rate limits. These lean generous — the goal is to blunt automated
// floods and brute force, not to get in a real user's way. req.ip is the
// client address because app.ts sets `trust proxy` (nginx forwards it via
// X-Forwarded-For); without that every request would look like 127.0.0.1 and
// the whole site would share one bucket.

const common = {
  standardHeaders: true as const, // RateLimit-* headers
  legacyHeaders: false as const,
  message: { error: 'Too many requests — slow down and try again in a moment.' },
};

// Broad safety net across the whole API. High enough that normal browsing
// (which fans out into several parallel calls per page) never trips it — even
// for a whole guild sharing one NAT'd IP. The strict per-endpoint limiters
// below do the real abuse protection; this is just a floor against floods.
export const apiLimiter = rateLimit({
  windowMs: 60_000,
  limit: 600,
  ...common,
});

// Sign-in start + OAuth callback. Tight, since there's no legitimate reason to
// hit these dozens of times a minute.
export const authLimiter = rateLimit({
  windowMs: 15 * 60_000,
  limit: 30,
  ...common,
});

// Uploads are anonymous by design and each one buffers a large body and queues
// a heavy .NET parse — the most abusable endpoint, so give it its own tight
// bucket on top of the parse-queue depth cap.
export const uploadLimiter = rateLimit({
  windowMs: 10 * 60_000,
  limit: 40,
  ...common,
});

// Endpoints that fan out to third-party APIs (GW2, dps.report) or kick off
// long background jobs — throttled so they can't be used to hammer those
// services (and get our IP throttled by them) or pile up work.
export const sensitiveLimiter = rateLimit({
  windowMs: 10 * 60_000,
  limit: 15,
  ...common,
});

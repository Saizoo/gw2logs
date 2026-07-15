import { PrismaClient } from '@prisma/client';

// Temporary diagnostic aid for tracking down slow/failing `include`-based
// queries in production — set DEBUG_PRISMA_QUERIES=1 to log each query's
// real DB execution time, to tell apart "the SQL itself is slow" from
// "something after the SQL completes is slow" (e.g. Prisma's own result
// conversion). Off by default so it doesn't spam logs once resolved.
const debugQueries = process.env.DEBUG_PRISMA_QUERIES === '1';

export const prisma = debugQueries
  ? new PrismaClient({ log: [{ level: 'query', emit: 'event' }] })
  : new PrismaClient();

if (debugQueries) {
  (prisma as PrismaClient).$on('query' as never, (e: any) => {
    console.log(`[prisma] ${e.duration}ms :: ${e.query}`);
  });
}

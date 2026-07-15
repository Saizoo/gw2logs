-- AlterTable: Log.uploadedBy already existed as a plain nullable string but
-- was never actually set by the upload route or backed by a real foreign
-- key. Wiring it up for real (routes/uploads.ts, routes/logs.ts POST
-- /:id/claim) so it needs a proper relation to User now.
CREATE INDEX "Log_uploadedBy_idx" ON "Log"("uploadedBy");

ALTER TABLE "Log" ADD CONSTRAINT "Log_uploadedBy_fkey" FOREIGN KEY ("uploadedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

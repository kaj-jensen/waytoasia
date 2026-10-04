-- Atomic response receipts let linked audit/activity writes run only for the winning update.
ALTER TABLE proposals ADD COLUMN response_receipt TEXT NOT NULL DEFAULT '';

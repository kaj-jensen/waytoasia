-- Keep the existing operational status constraints and record approval separately.
-- No existing customer records or child tables are rebuilt.
ALTER TABLE enquiries ADD COLUMN customer_approved_at TEXT;

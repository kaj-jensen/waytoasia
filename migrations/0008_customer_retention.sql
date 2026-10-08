ALTER TABLE customer_records ADD COLUMN retention_until TEXT;
CREATE INDEX customer_records_retention ON customer_records(retention_until);

PRAGMA foreign_keys=ON;
CREATE TABLE finance_files (
 enquiry_id TEXT PRIMARY KEY REFERENCES enquiries(id) ON DELETE CASCADE,
 currency TEXT NOT NULL DEFAULT 'EUR', status TEXT NOT NULL DEFAULT 'Draft',
 revision INTEGER NOT NULL DEFAULT 0, last_write TEXT NOT NULL DEFAULT '',
 is_demo INTEGER NOT NULL DEFAULT 0, updated_at TEXT NOT NULL
);
CREATE TABLE finance_items (
 id TEXT PRIMARY KEY, enquiry_id TEXT NOT NULL REFERENCES finance_files(enquiry_id) ON DELETE CASCADE,
 source_key TEXT, product_type TEXT NOT NULL, description TEXT NOT NULL, supplier TEXT NOT NULL DEFAULT '',
 travel_item_id TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'Draft',
 quote_json TEXT, actual_json TEXT, notes TEXT NOT NULL DEFAULT '',
 created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
 UNIQUE(enquiry_id,source_key)
);
CREATE INDEX finance_items_file ON finance_items(enquiry_id,product_type);
CREATE INDEX finance_items_supplier ON finance_items(supplier,product_type);
CREATE TABLE finance_payments (
 id TEXT PRIMARY KEY, enquiry_id TEXT NOT NULL REFERENCES finance_files(enquiry_id) ON DELETE CASCADE,
 item_id TEXT REFERENCES finance_items(id) ON DELETE SET NULL, kind TEXT NOT NULL, amount_minor INTEGER NOT NULL,
 currency TEXT NOT NULL, fx_rate TEXT NOT NULL, file_amount_minor INTEGER NOT NULL,
 date TEXT NOT NULL, due_date TEXT NOT NULL DEFAULT '', reference TEXT NOT NULL DEFAULT '',
 notes TEXT NOT NULL DEFAULT '', voided INTEGER NOT NULL DEFAULT 0,
 created_at TEXT NOT NULL, created_by TEXT NOT NULL
);
CREATE INDEX finance_payments_file ON finance_payments(enquiry_id,date);
CREATE TABLE finance_history (
 id TEXT PRIMARY KEY, enquiry_id TEXT NOT NULL REFERENCES finance_files(enquiry_id) ON DELETE CASCADE,
 revision INTEGER NOT NULL, action TEXT NOT NULL, actor TEXT NOT NULL, created_at TEXT NOT NULL,
 snapshot_json TEXT NOT NULL, UNIQUE(enquiry_id,revision)
);
CREATE INDEX finance_history_file ON finance_history(enquiry_id,revision);

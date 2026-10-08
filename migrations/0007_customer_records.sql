-- Personal fields are authenticated ciphertext; keys live in a Worker secret, never D1.
CREATE TABLE customer_records (
 enquiry_id TEXT PRIMARY KEY REFERENCES enquiries(id) ON DELETE CASCADE,
 ciphertext TEXT NOT NULL,
 revision INTEGER NOT NULL DEFAULT 1,
 updated_at TEXT NOT NULL,
 updated_by TEXT NOT NULL
);

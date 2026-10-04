PRAGMA foreign_keys = ON;
CREATE TABLE staff_users (email TEXT PRIMARY KEY COLLATE NOCASE, name TEXT NOT NULL, role TEXT NOT NULL CHECK(role IN ('admin','staff')), enabled INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL);
CREATE TABLE clients (id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE COLLATE NOCASE, name TEXT NOT NULL, phone TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL);
CREATE TABLE enquiries (id TEXT PRIMARY KEY, reference TEXT NOT NULL UNIQUE, client_id TEXT NOT NULL REFERENCES clients(id), source TEXT NOT NULL, requirements_json TEXT NOT NULL, original_message TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'New' CHECK(status IN ('New','In progress','Awaiting client','Proposal sent','Confirmed','Closed')), assigned_to TEXT REFERENCES staff_users(email), follow_up TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
CREATE INDEX enquiries_status_date ON enquiries(status,created_at);
CREATE INDEX enquiries_client ON enquiries(client_id);
CREATE INDEX enquiries_followup ON enquiries(follow_up);
CREATE INDEX enquiries_assigned ON enquiries(assigned_to,created_at);
CREATE TABLE activities (id TEXT PRIMARY KEY, enquiry_id TEXT REFERENCES enquiries(id) ON DELETE CASCADE, kind TEXT NOT NULL CHECK(kind IN ('incoming','outgoing','note','call','status','proposal')), actor TEXT NOT NULL, sender TEXT NOT NULL DEFAULT '', recipients_json TEXT NOT NULL DEFAULT '[]', subject TEXT NOT NULL DEFAULT '', body TEXT NOT NULL, created_at TEXT NOT NULL, provider_id TEXT UNIQUE, message_id TEXT, reply_to_id TEXT, delivery TEXT NOT NULL DEFAULT '', unread INTEGER NOT NULL DEFAULT 0);
CREATE INDEX activities_enquiry_date ON activities(enquiry_id,created_at);
CREATE INDEX activities_message_id ON activities(message_id);
CREATE TABLE enquiry_proposals (id TEXT PRIMARY KEY, enquiry_id TEXT NOT NULL REFERENCES enquiries(id) ON DELETE CASCADE, legacy_id TEXT REFERENCES proposals(id), title TEXT NOT NULL, url TEXT NOT NULL, version INTEGER NOT NULL, status TEXT NOT NULL CHECK(status IN ('Draft','Sent','Superseded','Accepted')), snapshot_json TEXT NOT NULL DEFAULT '{}', created_at TEXT NOT NULL, sent_at TEXT, sent_by TEXT, UNIQUE(enquiry_id,version));
CREATE TABLE attachments (id TEXT PRIMARY KEY, activity_id TEXT NOT NULL REFERENCES activities(id) ON DELETE CASCADE, filename TEXT NOT NULL, object_key TEXT NOT NULL UNIQUE, size INTEGER NOT NULL, content_type TEXT NOT NULL);
CREATE TABLE webhook_events (id TEXT PRIMARY KEY, created_at TEXT NOT NULL);
CREATE TABLE audit_log (id TEXT PRIMARY KEY, actor TEXT NOT NULL, action TEXT NOT NULL, target TEXT NOT NULL, created_at TEXT NOT NULL);
CREATE INDEX audit_log_date ON audit_log(created_at);
-- Non-content deduplication markers prevent delayed retries from resurrecting erased messages.
CREATE TABLE message_tombstones (provider_id TEXT PRIMARY KEY, created_at TEXT NOT NULL);

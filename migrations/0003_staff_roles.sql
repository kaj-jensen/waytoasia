-- Keep the legacy role column compatible with existing accounts.
ALTER TABLE staff_users ADD COLUMN access_role TEXT CHECK(access_role IN ('admin','staff','backoffice','finance','viewer'));
UPDATE staff_users SET access_role=role;

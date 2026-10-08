# Customer & passenger records

## Scope
The protected enquiry tab stores contact name, email, telephone, street address, postal code, city, country and up to 12 passengers (name, optional birth date/nationality). It deliberately has no general notes, medical, card, passport number or scan fields. It is not a document vault.

This is a separate encrypted record. Existing clients, enquiries, email bodies and proposal snapshots predate the vault and remain in their existing storage format. Saving the protected contact does not change the email recipient or migrate old copies. The UI states this explicitly. Full application-level encryption of legacy personal content is a separate migration; do not describe this release as encrypting the entire CRM.

## Security boundaries
- Cloudflare Access authentication and existing MFA policy precede application role checks.
- Administrators, sales and back-office can access records, per owner instruction. Finance and viewers cannot read/write the endpoint. Only administrators can remove identity or export the full customer record.
- AES-256-GCM, independent random 96-bit nonce per save, authentication tag, additional authenticated data bound to enquiry ID and format version. Ciphertext is the only personal content stored in customer_records.
- CUSTOMER_RECORDS_KEY is a 32-byte base64 Worker secret, separate from D1. There is no plaintext fallback, client-side key, localStorage or browser cache for records.
- Missing keys, corrupt ciphertext and ciphertext moved between enquiries fail closed. Never change/rotate the key without a tested re-encryption migration. Recovering encrypted backups requires the corresponding key; manage independent key recovery under restricted operational controls.
- A stolen database alone does not reveal vault fields. Application/admin/key compromise can still expose records; this is not protection against every breach.
- Opening and saving are audited with staff actor and record ID, not passenger contents. Updates use optimistic concurrency and reject stale writes.
- Explicit unlock; five-minute display timeout; clearing on section changes, navigation, page hide and browser tab hide. Unsaved edits are discarded on lock. The display timeout does not terminate the Cloudflare session.

## Privacy controls
The admin action requires typing REMOVE CUSTOMER IDENTITY and affects every enquiry for that client. No real customer deletion is performed as part of rollout or tests.
It deletes encrypted records, active enquiry communications and private attachments, removes linked proposal snapshots, closes enquiries and clears requirements/original messages. Contact identity is replaced with a synthetic non-deliverable address. Financial amounts remain; item descriptions, supplier/reference fields, notes and historical item/payment payloads are removed. Existing customer export includes encrypted profile contents after server-side decryption and an audited admin request. Full client deletion cascades to protected records.

The action is **de-identification of active records**, not certification of irreversible GDPR anonymization. Unique references, dates and financial records may permit linkage against external information. Email-provider copies, downloaded exports and Cloudflare backups are not erased by the action. Unmatched messages from the legacy contact address are also cleared. Shared linked proposals block removal and require separate review. Replies addressed to a retained de-identified file are suppressed; unrelated external copies still require review. Do not promise automatic GDPR compliance. Establish retention periods and legal holds for financial records before operating erasure on real files. Restore procedures must reapply erasure requests; provider-side erasure must be tracked separately.

## Verification
Automated tests cover encryption randomness, authentication/tampering, record binding, missing key, role denials, stale saves, persistence, audit content, subject export and identity removal preserving amounts. UI tests use synthetic records only.

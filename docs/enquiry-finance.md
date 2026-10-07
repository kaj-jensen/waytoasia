# Enquiry finances

Open `/dashboard#finances` for the portfolio, or **Financial overview** inside an enquiry. The protected API lives at `/dashboard/api/finance`. Financial data is never added to public proposal snapshots or customer emails.

## Records and calculations

Migration `0005_enquiry_finance.sql` adds file settings, linked financial items, a manual payment ledger and immutable revision snapshots. Items link to the existing enquiry and optionally a selected travel item. Quoted and actual components are separate; no automatic fallback occurs. Importing a selected journey creates unpriced entries and preserves existing financial work. Repeat import does not overwrite items; agents reconcile subsequent itinerary changes.

`functions/_lib/finance-calculations.ts` is the shared server calculation source for cards, tables, charts, CSV and revision snapshots. Monetary values use integer ISO currency minor units. Supplier cost and supplier commission use an explicitly saved supplier currency and FX rate; other components use file currency. FX means file-currency units per supplier/payment-currency unit. Rates are manual, never market estimates. Rounding occurs on conversion to the file currency. Currency cannot change after any items or ledger entries exist.

- Customer revenue = base customer price + markup + service fee − discount.
- Total cost = supplier cost before commission − supplier commission + other cost + payment cost.
- Gross earnings = revenue − total cost; margin = earnings / positive revenue × 100.
- Commission is a supplier receivable, not commission owed to a third party. Do not double count a commission already deducted from a net supplier price. Commission payable to another party belongs in other cost.
- No separate net-earnings KPI is shown: the displayed earnings already deduct all entered costs. No tax engine is implemented; enter taxes consistently in prices and costs.
- A zero or negative revenue has no meaningful margin percentage and displays a dash.
- Cancelled items are excluded from quoted totals but retain actual incurred costs/revenue. Use negative actual prices/costs for credits and cancellation adjustments. Cancelling a file does not erase its finances.
- Unpriced items remain visibly incomplete and are excluded from sums. A zero entered amount is priced, distinct from missing data.

Customer paid = receipts − refunds. Customer outstanding = selected-basis revenue − customer paid. Supplier balance = supplier cost − commission − supplier payments + supplier refunds; other/payment costs are not supplier payables. Refunds change cash balances, not booking values: update actual line amounts when a booking value changes. Record supplier payments against an item where possible; whole-file allocations are supported.

Invoice balance = invoices − credit notes − customer paid. Overdue is the unpaid due-invoice portion after allocating net receipts and credits oldest-due first; it is capped at the net invoice balance. Negative balances represent credits or overpayments. This ledger records existing transactions; it does not issue invoices, send emails, charge cards, or move money.

## Access and integrity

Administrator, Sales and Finance roles can read/edit financials. Back-Office can read/export. View only has no financial access. Existing enquiry permissions remain unchanged. All endpoints require signed Cloudflare Access identity and an active staff record, with same-origin checks on writes. CSV is internal and authenticated. Browser **PDF / Print** produces the internal financial report using Save as PDF, including charts, items and payments.

Each write requires the current revision. A guarded D1 transaction saves the mutation, new revision, immutable snapshot and audit entry atomically. Stale writes return 409 and require refresh. Ledger corrections void an entry with a reason rather than deleting it. Enquiry deletion cascades financial records using the existing administrator deletion workflow. Limits: 250 items, 500 ledger entries per file; latest 100 revisions are shown. History snapshots remain in storage beyond that display limit.

The portfolio uses the latest 200 financial files and groups currencies separately. It excludes the demo by default and supports assigned-agent filtering. Indexed enquiry, supplier, product and date relationships plus financial snapshots support later destination/agent/supplier/time analytics. The portfolio is not a complete accounting ledger or all-enquiry conversion-rate report.

## Demo and verification

**Open realistic demo** creates or reopens one clearly named synthetic family holiday with seven products, quote/actual differences, varied margins, an invoice, deposit and supplier payment. No email is sent and no real transaction occurs. Demo files are excluded from portfolio totals unless explicitly included.

Run `node --import tsx --test tests/dashboard/finance.test.ts` for financial invariants, permissions, persistence, conflicts, imports and ledger checks. Run `npm run preview:dashboard` for the loopback-only synthetic UI at `http://127.0.0.1:8788/preview-login`. Production must never enable the local identity fixture. Apply migration 0005 to the verified matching Way to Asia D1 database before deploying the new dashboard code.

## Published tour prices

Catalogue enquiries automatically resolve their saved `tour` (or `journey`) identifier against the same tour catalogue used by the website. The enquiry and full finance views show the current published guide price, inclusions and exclusions. The saved budget currency selects a published currency price; unsupported currencies fall back visibly to EUR. A party estimate is calculated only for a known adult-only party; child pricing is not assumed. Empty files default to that catalogue currency. Existing financial records and their currencies are preserved.

Published guide prices are explicitly labelled as current catalogue context, not a historical quotation, booked revenue, supplier cost or payment due. They do not create artificial profit or overwrite entered figures. Supplier costs and confirmation of the selling price are needed before recording booked financials.

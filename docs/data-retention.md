# Data retention policy (PDPA 2022)

| Data | Where | Retention | Notes |
|---|---|---|---|
| Orders, order items, invoices, payments | Order, OrderItem, Invoice, Payment | 7 years | Tax law. On account deletion they are unlinked from the customer. |
| Salary Advance applications, schedules, contracts | SalaryAdvanceApplication, InstalmentSchedule, Contract, storage `contracts/` | Life of plan + 7 years | NIDA, salary and account are AES-256-GCM encrypted at rest. |
| Customer profile | Customer, Address | Until deleted by the customer, or 3 years of inactivity | Self-service delete on the Account page. |
| Consent records | Customer.consentAt, Order.consentAt, Contract.consents | Same as the record they belong to | |
| Support tickets and photos | Ticket, TicketMessage, storage `tickets/` | 2 years after resolution | |
| OTP codes | OtpCode | 5-minute validity; purge after 24 hours | |
| Sessions | Session | Customer 30 days, staff 12 hours (idle timeout 30 min) | |
| Marketing sign-ups and consent | Subscriber | While subscribed; unsubscribed rows kept as a suppression record for 2 years (DEFAULT), then reduced to the brand + phone/email needed to keep honouring the opt-out | Deleted with the customer account. |
| Campaign send log | Campaign, CampaignSend | 2 years | Masked number/email and a hash only; no message body per person. |
| Loyalty points | LoyaltyLedger | Life of the account; points expire after 12 months (DEFAULT) | Deleted with the customer account. |
| Audit log | AuditLog | 7 years | No PII in diffs. |

Customers can export their data (including marketing sign-ups and loyalty points) (`/api/account/export`) and delete their account from `/[brand]/account`. Requests by phone/email are handled by support within 30 days.

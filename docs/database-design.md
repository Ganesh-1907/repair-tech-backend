# Production Database Design Notes

## Current State

The backend is now in a hybrid state.

Production-facing module buckets are routed through dedicated Mongoose models by `src/utils/modelRegistry.js`:

- `customers`
- `staff`
- `jobs`
- `inventoryitems`
- `assets`
- `contracts`
- `contractdevices`
- `contractschedules`
- `contractinvoices`
- `payments`
- `maintenancelogs`
- `alerts`

The legacy generic MongoDB collection still exists through `Record` for buckets that have not been migrated yet:

- `bucket`: logical collection name, such as `amcContracts`, `cmcContracts`, or `rentalContracts`
- `recordId`: business id
- `data`: mixed JSON payload

`Record` is useful for low-risk configuration records and temporary compatibility. It should not be used permanently for high-volume AMC, CMC, rental, billing, inventory, job, staff, or customer operations.

Default seed is now admin-only. Demo module rows are inserted only when running `npm run seed:demo` or `npm run seed:reset:demo`.

## Recommended Enterprise Shape

Use real domain collections or tables for operational records:

- `customers`
- `staff`
- `jobs`
- `inventory_items`
- `assets`
- `contracts`
- `contract_devices`
- `contract_schedules`
- `contract_invoices`
- `payments`
- `maintenance_logs`
- `alerts`
- `audit_events`

AMC, CMC, and rental should share a common contract core only for fields that are truly common:

- `contractType`: `AMC`, `CMC`, or `Rental`
- `customerId`
- `startDate`
- `endDate`
- `status`
- `billingCycle`
- `contractValue`
- `createdBy`
- `approvedBy`

Put type-specific fields in subtype collections or embedded typed sections:

- AMC: visit limits, covered services, non-comprehensive rules
- CMC: parts coverage, SLA, cost/profit tracking
- Rental: asset assignment, meter readings, deposits, add-ons, usage slabs

## Standard Indexes

At minimum, production collections should index:

- `tenantId`, if the app supports multiple companies
- `contractType + status`
- `customerId`
- `endDate` for renewal dashboards
- `assetId` and `serialNumber`
- `staffId + status`
- `invoiceId + paymentStatus`
- `createdAt` for reporting windows

## Migration Path From Current Record Store

1. Keep `Record` only for drafts, feature flags, low-risk settings, and temporary compatibility.
2. Continue moving any remaining operational buckets into dedicated models.
3. Add schema validation at the API and database layer before each module is considered production-ready.
4. Add audit events for create/update/delete and assignment changes.
5. Add tenant-aware indexes before multi-branch or multi-company usage.

## Practical Recommendation

Do not keep all AMC, CMC, and rental operational data permanently inside one mixed `records` table. For production, use a shared contract model plus typed details and dedicated invoice/payment/device/schedule collections. That gives cleaner reporting, safer validation, faster dashboards, and easier future scaling.

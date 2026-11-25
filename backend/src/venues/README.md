# Venues, Courts, Pricing

The module owns venue/court metadata, weekly opening hours, hourly price rules,
maintenance blocks, and administrator review of owner accounts.

## API

All paths are prefixed with `/api`.

| Method and path | Access | Purpose |
|---|---|---|
| `GET /venues?q=&sport=` | Public | Search approved, active venues |
| `GET /venues/:venueId` | Public | Read venue, opening hours, active courts and price rules |
| `GET /venues/mine` | Owner/Admin | List manageable venues and courts |
| `POST /venues` | Approved owner | Create a venue and weekly hours |
| `PATCH /venues/:venueId` | Owner/Admin | Edit venue details and optionally replace weekly hours |
| `DELETE /venues/:venueId` | Owner/Admin | Deactivate venue and its courts without deleting booking history |
| `POST /venues/:venueId/courts` | Owner/Admin | Add a court |
| `PATCH /courts/:courtId` | Owner/Admin | Edit a court |
| `DELETE /courts/:courtId` | Owner/Admin | Deactivate a court |
| `POST /courts/:courtId/pricing` | Owner/Admin | Add a time/day price rule |
| `PATCH /pricing/:ruleId` | Owner/Admin | Edit a price rule |
| `DELETE /pricing/:ruleId` | Owner/Admin | Delete a price rule |
| `GET /courts/:courtId/maintenance` | Owner/Admin | List maintenance periods |
| `POST /courts/:courtId/maintenance` | Owner/Admin | Block a court for maintenance |
| `DELETE /maintenance/:maintenanceId` | Owner/Admin | Remove a maintenance block |
| `GET /admin/owners/pending` | Admin | List owner applications awaiting review |
| `PATCH /admin/owners/:ownerId/approval` | Admin | Approve or reject an owner (`{ "status": "APPROVED" }`) |

`dayOfWeek` uses JavaScript numbering (`0` Sunday through `6` Saturday).
An all-days price rule uses `dayOfWeek: null`; it can coexist with a
day-specific rule as a base rate and override. Rules for the same day cannot
overlap. Maintenance blocks use half-open intervals `[startAt, endAt)` and
cannot overlap pending/confirmed bookings or another maintenance block.

Venue, court, and opening-hour updates are validated using the global
`ValidationPipe`. Venue and court deletion is intentionally a soft deactivation
so existing bookings and reviews remain attached to their records.

## Authentication integration

Protected handlers use `RolesGuard` and expect the authentication layer to set
`request.user` to `{ id: string, role: 'CUSTOMER' | 'OWNER' | 'ADMIN' }`.
The guard rejects missing user context; the service additionally verifies
owner approval and venue ownership. The Auth module should provide the
authentication guard that validates the session/token and populates this
request property before these handlers run.

The Booking module must also check `CourtMaintenance` when offering or creating
bookings. Maintenance creation checks existing `PENDING` and `CONFIRMED`
bookings, but booking creation must perform the reciprocal check to avoid a
booking racing with a maintenance request.

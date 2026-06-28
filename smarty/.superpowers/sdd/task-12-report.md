# Task 12: Sameday EasyBox Shipping

## Summary

Implemented Sameday EasyBox shipping integration for the Smarty marketplace. Sellers can create EasyBox shipments for paid orders, and users can browse locker locations and track shipments.

## Files Created

- **`src/server/sameday.ts`** -- Sameday API client with:
  - Automatic bearer-token authentication with caching and expiry detection
  - `getEasyboxLocations(city?)` -- fetches EasyBox locker locations from the Sameday API, optionally filtered by city
  - `createEasyboxShipment(params)` -- creates an EasyBox AWB shipment. Accepts sender/recipient details, parcel dimensions, and target locker ID. Automatically persists the `Shipment` record to the database and updates the Order status to `SHIPPED`.
  - `trackShipment(awbNumber)` -- fetches tracking status and full history for an AWB
  - `SamedayError` error class with HTTP status codes
  - Config via env vars: `SAMEDAY_API_URL`, `SAMEDAY_USERNAME`, `SAMEDAY_PASSWORD`, `SAMEDAY_EASYBOX_SERVICE_ID`

- **`src/server/api/routers/shipping.ts`** -- tRPC shipping router with 4 procedures:
  - `createShipment` (protected) -- seller-only. Validates order ownership, payment status, no duplicate shipment, contact info completeness. Delegates to `createEasyboxShipment`.
  - `getLocations` (public) -- returns EasyBox locker list, optional city filter. Delegates to `getEasyboxLocations`.
  - `trackShipment` (public) -- returns tracking status/history for an AWB. Delegates to `trackShipment`.
  - `getByOrderId` (protected) -- returns shipment details for a specific order. Accessible by both buyer and seller of that order.

## Files Modified

- **`src/server/api/root.ts`** -- added `shippingRouter` to `appRouter`
- **`.env`** -- added `SAMEDAY_API_URL`, `SAMEDAY_USERNAME`, `SAMEDAY_PASSWORD`, `SAMEDAY_EASYBOX_SERVICE_ID`

## Key Design Decisions

- **Lazy DB import**: The `createEasyboxShipment` function dynamically imports `@/lib/prisma` rather than requiring it at module level, keeping the client file self-contained and testable without a database connection.
- **Auth token caching**: The bearer token is cached in memory with a 1-minute safety margin before expiry, avoiding redundant auth calls on every API request.
- **Prisma schema reuse**: The existing `Shipment` model (with `easyboxAWB`, `pickupCode`, `trackingUrl`, `status`, `estimatedDelivery`) and `OrderStatus.SHIPPED` enum were already in the schema -- no migrations needed.
- **SamedayAPI default service ID 4**: Standard Sameday EasyBox service ID is used as default, overridable via env var.

## Build Status

- Build: **PASS** (Next.js 16.2.9, TypeScript check passed)
- Commit: `ff6880d` - `feat: add Sameday EasyBox shipping`

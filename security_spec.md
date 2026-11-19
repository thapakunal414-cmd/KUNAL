# CampusEase Firestore Security Specification

## 1. Data Invariants
1. Every document in `users/{userId}/public/profile` and `users/{userId}/private/info` must belong to `request.auth.uid == userId` and require `request.auth.token.email_verified == true`.
2. PII (`email`, `phone`, `hostelAddress`) is strictly isolated in `users/{userId}/private/info` and `bookings/{bookingId}` and is readable only by the owning student (`uid == request.auth.uid`).
3. Bookings cannot be created with another user's `uid`, non-positive totals, or terminal statuses (`Completed`, `Cancelled`); initial creation status must be `Confirmed`.
4. Booking line items in `bookings/{bookingId}/items/{itemId}` cannot exist without an existing parent booking owned by `request.auth.uid` (Master Gate).
5. Once a booking reaches a terminal status (`Completed` or `Cancelled`), no further updates are permitted (Terminal State Locking).
6. Loyalty ledger entries (`users/{userId}/loyaltyLedger/{entryId}`) are append-only (`create` allowed for verified owner; `update` and `delete` strictly denied).
7. Redeemed vouchers (`users/{userId}/vouchers/{voucherId}`) must start with `usedInBookingId == ""` and may transition once to a non-empty booking ID, after which they are locked.

## 2. Dirty Dozen Adversarial Payloads
1. **Unauthenticated Profile Write**: `request.auth == null` writing to `/users/u1/private/info` -> `PERMISSION_DENIED`.
2. **Unverified Email Spoof**: `request.auth.uid == 'u1'` with `email_verified == false` writing to `/users/u1/public/profile` -> `PERMISSION_DENIED`.
3. **Cross-User PII Read**: Authenticated user `u2` reading `/users/u1/private/info` -> `PERMISSION_DENIED`.
4. **Shadow Field Injection on Profile**: Creating `/users/u1/public/profile` with extra ghost field `isAdmin: true` -> `PERMISSION_DENIED`.
5. **Booking Ownership Spoofing**: User `u2` creating `/bookings/b1` with `uid: 'u1'` -> `PERMISSION_DENIED`.
6. **Pre-Completed Booking Creation**: Creating `/bookings/b1` directly with `status: 'Completed'` and `pointsEarned: 9999` -> `PERMISSION_DENIED`.
7. **Orphaned Booking Item**: Creating `/bookings/nonexistent/items/i1` -> `PERMISSION_DENIED`.
8. **Terminal State Bypass**: Updating `/bookings/b1` after `status == 'Completed'` -> `PERMISSION_DENIED`.
9. **Client Timestamp Forgery**: Creating `/bookings/b1` with backdated `createdAt` instead of `request.time` -> `PERMISSION_DENIED`.
10. **ID Poisoning Attack**: Writing to `/bookings/<200-char-junk-id>` -> `PERMISSION_DENIED`.
11. **Ledger Tampering**: Updating or deleting `/users/u1/loyaltyLedger/l1` -> `PERMISSION_DENIED`.
12. **Blanket List Scraping**: Listing `/bookings` without `uid == request.auth.uid` constraint -> `PERMISSION_DENIED`.

# Bookings, Reviews & Admin API

All responses: `{ "success": true|false, "message": "...", "data": ... }` (`data` is `null` on errors).
Protected routes need `Authorization: Bearer <token>`.

## Bookings — `/api/bookings` (login required)

| Method | Route | Who | Body / query |
|---|---|---|---|
| POST | `/api/bookings` | customer | `{ serviceId, requestedDate, notes? }` |
| GET | `/api/bookings` | any | `?status=pending` (optional). Customer sees own, provider sees received, admin sees all |
| GET | `/api/bookings/:id` | owner customer, owner provider, admin | — |
| PATCH | `/api/bookings/:id/status` | see rules below | `{ status }` |

`providerId` is taken from the service, never from the request body. `requestedDate` must be in the future.

Booking object (returned populated):

```json
{
  "_id": "...",
  "customerId": { "_id": "...", "name": "...", "email": "...", "phone": "..." },
  "providerId": { "_id": "...", "name": "...", "email": "...", "phone": "..." },
  "serviceId":  { "_id": "...", "title": "...", "price": 5000 },
  "requestedDate": "2026-10-10T09:00:00.000Z",
  "notes": "...",
  "status": "pending",
  "createdAt": "..."
}
```

Status rules:

| Who | From | To |
|---|---|---|
| provider | `pending` | `accepted`, `declined` |
| provider | `accepted` | `completed` |
| customer | `pending`, `accepted` | `cancelled` |
| admin | any | any |

Any other change returns 400.

## Reviews — `/api/reviews`

| Method | Route | Who | Body / query |
|---|---|---|---|
| GET | `/api/reviews` | public | `?serviceId=...` or `?providerId=...` (one is required) |
| POST | `/api/reviews` | customer who owns the booking | `{ bookingId, rating (1–5 whole number), comment? }` |
| DELETE | `/api/reviews/:id` | admin | — |

A review is only allowed once the booking is `completed`, and only one review per booking (a second attempt returns 409).

GET returns `data: { reviews: [...], averageRating: 4.5, count: 2 }`. Each review has `_id, bookingId, customerId { _id, name }, providerId, serviceId, rating, comment, createdAt`.

## Admin — `/api/admin` (admin only)

| Method | Route | Body / query |
|---|---|---|
| GET | `/api/admin/users` | `?role=provider` (optional) |
| PATCH | `/api/admin/users/:id/role` | `{ role }` |
| DELETE | `/api/admin/users/:id` | — |
| GET | `/api/admin/stats` | — |

Admins cannot change their own role or delete their own account. `passwordHash` is never returned.

Stats `data`: `{ users: { customer, provider, admin }, totalUsers, totalServices, totalReviews, bookings: { pending, accepted, declined, completed, cancelled }, totalBookings }`.

Note: `src/models/Service.js` is a minimal model with the agreed fields (`title, description, price, categoryId, providerId`) so bookings can look up the provider. If the Services API is built separately, keep one copy of that model.

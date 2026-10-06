# Handled REST API Documentation

## Base URLs

- Production: `https://handeled-service-marketplace-api.onrender.com`
- Local: `http://localhost:5000`

The Render URL intentionally retains the original `handeled` spelling.

## Authentication and responses

Protected routes require:

```http
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

Success response:

```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": {}
}
```

Error response:

```json
{
  "success": false,
  "message": "Helpful error message",
  "data": null
}
```

Common status codes: `200` success, `201` created, `400` invalid input,
`401` missing/invalid token, `403` insufficient permission, `404` not found,
`409` duplicate/conflict, and `500` unexpected server error.

## Health

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| GET | `/` | Public | Confirm that the API is running |

## Authentication

| Method | Endpoint | Access | Request body |
|---|---|---|---|
| POST | `/api/auth/register` | Public | `name`, `email`, `password`, optional `role`, optional `phone` |
| POST | `/api/auth/login` | Public | `email`, `password` |

Registration accepts `customer` or `provider`; administrator accounts are created
through the protected admin endpoint. Passwords require at least six characters.

Register example:

```json
{
  "name": "Ada Customer",
  "email": "ada@example.com",
  "password": "secret1",
  "role": "customer",
  "phone": "+2348000000000"
}
```

Successful authentication returns:

```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "token": "jwt-token",
    "user": {
      "id": "user-id",
      "name": "Ada Customer",
      "email": "ada@example.com",
      "role": "customer"
    }
  }
}
```

Possible errors: missing fields `400`, invalid email/password format `400`,
incorrect credentials `401`, and duplicate email/phone `409`.

## Services

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| GET | `/api/services` | Public | List/search/filter services |
| GET | `/api/services/:id` | Public | Get one service |
| POST | `/api/services` | Provider/Admin | Create a service |
| PATCH | `/api/services/:id` | Owner provider/Admin | Update a service |
| DELETE | `/api/services/:id` | Owner provider/Admin | Delete a service |

List query parameters:

- `q`: search title and description
- `category`: category ID or slug
- `provider`: provider ID
- `page` and `limit`: optional pagination (`limit` maximum is 100)

When pagination is requested, response headers contain `X-Total-Count`, `X-Page`,
and `X-Limit`; `data` remains an array for frontend compatibility.

Create request:

```json
{
  "title": "Professional Plumbing Repair",
  "description": "Residential plumbing diagnosis and repair.",
  "price": 15000,
  "categoryId": "category-object-id"
}
```

The authenticated provider becomes `providerId`. Price must be non-negative and
the category must exist. Invalid input returns `400`, missing records return `404`,
and modification by a non-owner returns `403`.

## Categories

| Method | Endpoint | Access | Request body/purpose |
|---|---|---|---|
| GET | `/api/categories` | Public | List categories |
| GET | `/api/categories/:id` | Public | Get one category |
| POST | `/api/categories` | Admin | `{ "name": "Plumbing" }` |
| PATCH | `/api/categories/:id` | Admin | `{ "name": "Home Plumbing" }` |
| DELETE | `/api/categories/:id` | Admin | Delete unused category |

Names and generated slugs are unique. A category containing services cannot be
deleted. Duplicate names return `409`.

## Bookings

All booking routes require login.

| Method | Endpoint | Access | Request body/query |
|---|---|---|---|
| POST | `/api/bookings` | Customer | `serviceId`, `requestedDate`, optional `notes` |
| GET | `/api/bookings` | Logged-in user | Optional `?status=pending` |
| GET | `/api/bookings/:id` | Participant/Admin | Get one booking |
| PATCH | `/api/bookings/:id/status` | Participant/Admin | `{ "status": "accepted" }` |

Customers see their bookings, providers see bookings received, and administrators
see all bookings. `requestedDate` must be in the future and notes are limited to
1,000 characters. `providerId` is derived from the selected service.

Allowed status transitions:

| Actor | Current status | Allowed next status |
|---|---|---|
| Provider | `pending` | `accepted`, `declined` |
| Provider | `accepted` | `completed` |
| Customer | `pending`, `accepted` | `cancelled` |
| Admin | Any | Any valid status |

Valid statuses are `pending`, `accepted`, `declined`, `completed`, and `cancelled`.

## Reviews

| Method | Endpoint | Access | Request/query |
|---|---|---|---|
| GET | `/api/reviews` | Public | `?serviceId=...` or `?providerId=...` |
| POST | `/api/reviews` | Booking customer | `bookingId`, `rating`, optional `comment` |
| DELETE | `/api/reviews/:id` | Admin | Moderate/delete review |

Example request:

```json
{
  "bookingId": "completed-booking-id",
  "rating": 5,
  "comment": "Excellent service."
}
```

Ratings must be whole numbers from 1 to 5. Only the customer who owns a completed
booking can review it, and each booking can be reviewed once. Duplicate reviews
return `409`. Comments are limited to 1,000 characters.

The public list returns:

```json
{
  "success": true,
  "message": "Reviews retrieved successfully",
  "data": {
    "reviews": [],
    "averageRating": 0,
    "count": 0
  }
}
```

## Administration

Every route requires an administrator token.

| Method | Endpoint | Purpose/body |
|---|---|---|
| POST | `/api/admin/users` | Create admin: `name`, `email`, `password`, optional `phone` |
| GET | `/api/admin/users` | List users; optional `?role=provider` |
| PATCH | `/api/admin/users/:id/role` | Change role: `{ "role": "provider" }` |
| DELETE | `/api/admin/users/:id` | Delete user |
| GET | `/api/admin/stats` | Platform totals by role/status |

An administrator cannot change their own role or delete their own account.
`passwordHash` is excluded from every user response.

Stats data contains user totals, service/review totals, and booking totals grouped
by status.

## Example authorization errors

Missing token:

```json
{
  "success": false,
  "message": "Unauthorized — no token provided",
  "data": null
}
```

Wrong role:

```json
{
  "success": false,
  "message": "Insufficient permission",
  "data": null
}
```

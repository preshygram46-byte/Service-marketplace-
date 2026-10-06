# Handled Service Marketplace

Handled is a full-stack service marketplace where customers discover providers,
request services, track bookings, and leave reviews. Providers manage booking
requests, while administrators manage users, categories, services, reviews, and
platform statistics.

## Live application

- Frontend: https://handeled-service-marketplace-app.onrender.com
- Backend API: https://handeled-service-marketplace-api.onrender.com

> The deployed Render URLs retain the original `handeled` spelling. Do not change
> those URLs unless new Render services are created.

## Main features

- Customer/provider registration and login
- JWT authentication and role-based authorization
- Service and category CRUD operations
- Service search, filtering, and optional pagination
- Customer booking requests and controlled status transitions
- Reviews for completed bookings
- Admin user management and platform statistics
- Consistent JSON responses, validation, and error handling
- MongoDB persistence and deployed frontend/backend integration

## Technology

- Backend: Node.js, Express.js
- Database: MongoDB with Mongoose
- Authentication: JSON Web Tokens and bcryptjs
- Frontend: HTML, CSS, and JavaScript
- Deployment: Render and MongoDB Atlas

## Project structure

```text
src/
  config/       Database configuration
  controllers/  Request handlers and business logic
  middleware/   Authentication, roles, and error handling
  models/       Mongoose database models
  routes/       REST API routes
  utils/        Response and validation helpers
docs/           API and testing documentation
tests/          Backend tests
public/         Frontend application
server.js       Application entry point
```

## Local setup

1. Clone the repository.
2. Install dependencies with `npm install`.
3. Copy `.env.example` to `.env`.
4. Add your MongoDB connection and JWT secret.
5. Start the API with `npm run dev`.

Required environment variables:

```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_private_jwt_secret
JWT_EXPIRES_IN=7d
FRONTEND_URL=http://127.0.0.1:5500
```

Never commit `.env` or real credentials.

## Commands

```bash
npm start       # production server
npm run dev     # development server
npm test        # local unit tests
npm run test:live # public API smoke tests
```

## API documentation

See [docs/api-documentation.md](docs/api-documentation.md) for every endpoint,
authentication requirement, request format, and response format.

## Testing

See [docs/testing.md](docs/testing.md) for automated and manual test coverage.

## API response format

```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": {}
}
```

Errors use the same structure with `success: false` and `data: null`.

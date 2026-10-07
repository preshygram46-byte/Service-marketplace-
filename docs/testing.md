# Backend Testing

## Automated unit tests

Run:

```bash
npm test
```

The unit suite verifies:

- Email and password validation
- Standard success and error response structures
- Role-based authorization
- Rejection of missing JWTs
- Acceptance and decoding of valid JWTs

## Live API smoke tests

Run against the deployed API:

```bash
npm run test:live
```

To test a different deployment:

```bash
API_BASE_URL=http://localhost:5000 npm run test:live
```

On Windows PowerShell:

```powershell
$env:API_BASE_URL="http://localhost:5000"
npm run test:live
```

The smoke suite verifies the health endpoint, public services response,
unauthenticated route protection, and invalid-ID error handling. A sleeping free
Render service may take around a minute to answer the first request.

## Manual end-to-end checklist

1. Register separate customer and provider accounts.
2. Log in with each account and confirm a token is returned.
3. Confirm invalid credentials show a safe 401 response.
4. Create a category as an administrator.
5. Create, update, and delete a service as its provider.
6. Confirm another provider cannot modify that service.
7. Create a future-dated booking as a customer.
8. Accept and complete the booking as its provider.
9. Submit one review as the booking customer.
10. Confirm a second review for the same booking returns 409.
11. Confirm customer/provider tokens cannot access `/api/admin/*`.
12. Confirm passwords and password hashes never appear in responses.

Record the date and result of the final deployed test here:

| Date | Environment | Result |
|---|---|---|
| 2026-10-06 | Render production | Core public and protected routes verified |

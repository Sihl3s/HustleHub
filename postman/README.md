# Postman collection — TODO (Thami)

Part 1 must include a Postman collection that shows successful registration and login, plus invalid scenarios. Screenshots of API responses and a demonstration video are also required.

Do not commit secrets. Use the local HTTPS URL and the JWT returned by login.

## Base URL

`https://127.0.0.1:3443`

In Postman: Settings → turn **SSL certificate verification** off for this local self-signed certificate.

## Requests to include

Save the collection as `postman/HustleHub.postman_collection.json` in this folder.

1. `GET /health` — API is running over HTTPS (200).
2. `POST /api/auth/register` — valid body, expect 201 and a JWT (after Lesedi finishes hashing and storage).
3. `POST /api/auth/register` — missing fields / invalid email / short password (400).
4. `POST /api/auth/register` — duplicate email (409).
5. `POST /api/auth/login` — valid credentials, expect 200 and a JWT.
6. `POST /api/auth/login` — wrong password or unknown email (401, same generic message).
7. `GET /api/me` — `Authorization: Bearer <token>` (200).
8. `GET /api/me` — missing or invalid token (401).

### Example register body

```json
{
  "email": "freelancer@example.com",
  "password": "Str0ngPass!",
  "fullName": "Ada Freelancer",
  "role": "freelancer"
}
```

### Example login body

```json
{
  "email": "freelancer@example.com",
  "password": "Str0ngPass!"
}
```

## Submission checklist

- [ ] Postman collection exported into this folder
- [ ] Screenshots of successful register and login (including the token)
- [ ] Screenshots of invalid/unauthorised responses
- [ ] Demonstration video: API running over HTTPS, successful registration, login with token generation
- [ ] Video link added where the team agrees to submit it (README or submission form)

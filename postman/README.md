# Postman collection and Newman

`postman/HustleHub.postman_collection.json` covers the Part 2 API in four folders:

1. **Authentication**: register (freelancer, second freelancer, client), invalid input, duplicate email, admin self-registration refused, login success and failure, `/api/me` with and without a token.
2. **Gigs**: create, browse, view, list own, update, invalid input, delete.
3. **Bookings and transactions**: client books a gig, bookings for client and freelancer, booking by id, transactions for both roles, freelancer income summary.
4. **Security and access control**: missing and tampered JWTs, RBAC (client creating gigs, freelancer booking, client reading income), ownership (another freelancer editing or deleting a gig, an outsider viewing a booking), price tampering, NoSQL injection, XSS escaping, malformed JSON, invalid ids and security headers.

Every request has `pm.test` assertions, and tokens and ids are passed between requests through collection variables. Each run generates fresh email addresses, so the collection can be run repeatedly.

## Run with Newman (recommended)

From the `backend` folder:

```bash
npm install
npm run test:api
```

This starts the HTTPS API on a free local port with an in-memory MongoDB and a temporary certificate, runs the collection with Newman, and writes evidence to `docs/evidence/`:

| File | Contents |
| --- | --- |
| `newman-run.txt` | Newman CLI output (`npm run test:api > ../docs/evidence/newman-run.txt`) |
| `newman-junit.xml` | JUnit report of every request and assertion |
| `newman-server-events.jsonl` | The API's security event log for the run (logins, RBAC denials, ownership denials, bookings) |

## Run in Postman

1. Start MongoDB and the API (`cd backend`, `npm start`). It listens on `https://127.0.0.1:3443`.
2. In Postman, choose **Import** and select `HustleHub.postman_collection.json`.
3. Under **Settings**, turn **SSL certificate verification** off (the local certificate is self-signed).
4. Open the collection and click **Run** to run every request in order.

## Expected results

| Request | Status |
| --- | --- |
| Register / login success | 201 / 200 with a JWT |
| Invalid input, unexpected fields, NoSQL injection, malformed JSON, invalid id | 400 |
| Duplicate email | 409 |
| Missing or tampered JWT, wrong password | 401 |
| Wrong role (client creating gigs, freelancer booking, client reading income) | 403 |
| Editing or deleting another freelancer's gig | 403 |
| Viewing someone else's booking | 404 |
| Booking a gig | 201 with a confirmation reference and transaction |

The Part 1 demo video is linked in the root README.

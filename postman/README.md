# Postman collection — Thami

A ready-made collection is in this folder:

`postman/HustleHub.postman_collection.json`

## What you still need to do

1. `git pull` so you have the latest `main`.
2. Start the API (`cd backend`, copy `.env.example` to `.env`, set `JWT_SECRET`, `npm install`, `npm run generate-certs`, `npm start`).
3. Open Postman → **Import** → choose `HustleHub.postman_collection.json`.
4. File → Settings → **SSL certificate verification = OFF**.
5. Send the 8 requests **in order** (1 → 8).
6. Screenshot:
   - successful register (201) and login (200), including the token
   - invalid/unauthorised responses (400, 409, 401)
7. Record the demo video: API running over HTTPS → register → login showing the token.
8. If you edit the collection, export it back into this folder and push.
9. The demo video is linked in the root README: https://youtu.be/ZT6XeQMRhIE

## Expected results

| Request | Status |
| --- | --- |
| GET /health | 200 |
| POST /api/auth/register (valid) | 201 + token |
| POST /api/auth/register (invalid) | 400 |
| POST /api/auth/register (same email again) | 409 |
| POST /api/auth/login (valid) | 200 + token |
| POST /api/auth/login (wrong password) | 401 |
| GET /api/me (Bearer token) | 200 |
| GET /api/me (no token) | 401 |

If register success returns 409, that email is already in `backend/data/users.json`. Use a new email or delete that JSON file (keep the `data` folder).

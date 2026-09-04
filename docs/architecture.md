# Architecture diagram (TODO — Blessing)

Part 1 requires an architecture diagram of the overall HustleHub+ system. The diagram must reflect the **MERN** architecture and must show security features and system boundaries.

Insert the finished diagram in the project README (export a PNG/SVG or use a Mermaid figure). This file is only a checklist of what the diagram should include.

## Components to show

- **Client devices** — browser users (Clients, Freelancers, Admin)
- **React frontend** (later POE parts) — user interface
- **HTTPS / TLS boundary** — all traffic to the API is encrypted
- **Node.js + Express API** — registration, login, protected routes
- **Security controls inside the API**
  - Input validation and sanitisation
  - Password hashing (no plain-text passwords)
  - JWT generation and validation middleware
  - Controlled error responses (no stack traces)
  - Event logging (no secrets in logs)
- **User store**
  - Part 1: local file-based storage
  - Later parts: MongoDB
- **System boundary** — what sits inside HustleHub+ versus external users/clients

## Suggested layout

```text
[ Browser / React client ]
            |
         HTTPS
            |
[ Express API + Helmet + validation + JWT middleware ]
            |
     ---------------
     |             |
[ File store ]  [ MongoDB — later ]
[ Part 1     ]
```

Replace the sketch with a clear diagram (draw.io, Mermaid, or similar) before submission.

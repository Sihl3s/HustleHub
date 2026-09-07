# HustleHub+

## A Freelance Marketplace Platform

HustleHub+ is a **freelance marketplace platform** designed to allow **freelancers to advertise their services** and **clients to browse, book, and engage with available services**. Administrators are responsible for managing and overseeing the platform.

Because HustleHub+ handles sensitive information such as **user credentials, transactional records, and income-related data**. The system is then designed to treat security as a core requirement throughout the system rather than an afterthought.

---

## Table of Contents

- [System Overview](#-system-overview)
- [Intended Users](#-intended-users)
- [Key Components](#-key-components)
- [Technology Stack](#-technology-stack)
- [System Architecture](#-system-architecture)
- [Data Flow](#-data-flow)
- [Security](#-security)
  - [JWT Authentication](#jwt-authentication)
  - [Input Validation](#input-validation)
  - [Secure Error Handling](#secure-error-handling)
  - [HTTPS/TLS](#httpstls)
  - [Security Headers](#security-headers)
  - [Rate Limiting](#rate-limiting)
  - [Secure Logging](#secure-logging)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
- [Environment Variables](#-environment-variables)
- [Demo Video](#-demo-video)
- [Authors](#-authors)

---

# System Overview

HustleHub+ is built as a **full-stack web application** using the MERN technology stack.

The primary goal of the system is to provide:

- A secure platform for freelancers to advertise their services.
- A marketplace where clients can browse available services.
- A booking mechanism for clients to request freelance services.
- Role-based access control for different types of users.
- Secure authentication and authorization.
- Protection of sensitive user and transactional information.

---

# Intended Users

HustleHub+ supports three primary user roles:

| Role | Description |
|------|-------------|
| **Freelancer** | Registers on the platform and advertises services that clients can browse and book. |
| **Client** | Browses available services and books services offered by freelancers. |
| **Administrator** | Manages and oversees the platform through privileged administrative functionality. |

The application implements **Role-Based Access Control (RBAC)** to ensure that users can only access functionality appropriate to their assigned role.

---

#  Key Components

The HustleHub+ system consists of four primary components:

### Frontend (Will be implemented in future parts)

The frontend provides the user-facing interface through which clients, freelancers, and administrators interact with the system.

It is built using **React**.

### Backend

The backend contains the application's business logic, including:

- Authentication
- Authorization
- User registration
- User login
- Password hashing
- Input validation
- Role-based access control
- Error handling
- API request processing

The backend is built using **Node.js** and **Express.js**.

### API

The API acts as the communication layer between the frontend and backend services.

Client requests are sent to the API using **HTTPS** and data is exchanged in **JSON** format.

### Database (To be implemented in futre parts)

**MongoDB** will used to store application data, including user information and other platform-related records. Currently data is stored with file-based user storage.

---

# Technology Stack

Hustle Hub+ implements the **MERN architecture**, which combines four technologies within a unified JavaScript ecosystem:

| Technology | Purpose |
|------------|---------|
| **MongoDB** (To be implemeted in the future)| Database and persistent data storage (Currently stored in file-based storage) |
| **Express.js** | Backend web framework and API routing |
| **React** | Frontend user interface (To be implemented in future parts)|
| **Node.js** | Backend JavaScript runtime |


---

#  System Architecture

HustleHub+ follows a **3-tier architecture** consisting of:

### Architecture Diagram

![HustleHub+ Architecture Diagram](docs/images/architecture-diagram.png)

---

# Data Flow

The general flow of data through the MERN architecture is as follows:

### 1. User Request (Will be implemented in future parts)

The user accesses the React frontend through a device such as:

- Desktop computer
- Laptop
- Mobile phone
- Tablet

### 2. Secure Communication (Kath, 2021)

The frontend sends a request to the backend API using **HTTPS/TLS**.
HTTPS encrypts traffic between the client and server, helping protect sensitive information such as credentials and authentication tokens while they are transmitted.

The requests and responses are exchanged in **JSON format**.

### 3. API Processing

The Node.js server receives the request through an **Express.js route**.
The request is then processed by the appropriate middleware and business logic.

This may include:

- Authentication
- Authorization
- Input validation
- Business rules
- Data processing

### 4. Database Access - To be implemented in future parts (MongoDB,2026)

Implemented in Part One is file-based user storage instead of MongoDB. 

When persistent data is required, Express.js communicates with the **MongoDB database**.

MongoDB processes the query and returns the requested information to the backend.

### 5. Response

The backend processes the database response and sends the appropriate result back to the React frontend as a JSON response.

The frontend then updates the user interface accordingly.

---

# Security

Security is a primary design consideration within Hustle Hub+ because the platform processes sensitive information, including:

- User credentials
- Authentication tokens
- Transactional information
- Income-related information
- Personal user information

The following security mechanisms have been implemented.

---

## JWT Authentication (Sheffer, Hardt and Jones, 2020; OWASP, 2025a)

After a successful login or registration, the API issues a **short-lived JSON Web Token (JWT)**.

The JWT is signed using the **HS256 algorithm**.

The signing secret is stored in an environment variable rather than directly in the source code:

```text
JWT_SECRET
```

The implementation can be found in:

```text
backend/src/utils/jwt.js
```

Protected API routes use authentication middleware to verify the JWT.

For example:

```text
GET /api/me
```

The authentication middleware reads the token from the HTTP `Authorization` header:

```text
Authorization: Bearer <token>
```

The token is verified on every protected request.

JWT verification is explicitly restricted to **HS256**, helping prevent algorithm-confusion attacks.

Relevant implementation:

```text
backend/src/middleware/authenticate.js
```

---

## Input Validation (OWASP, 2025c; Expressjs, 2025)

Authentication requests are validated before reaching the application's business logic.

The project uses **express-validator** to validate incoming request bodies.

Validation includes:

- Email normalization
- Name sanitization/escaping
- Password length requirements
- Rejection of unexpected fields
- Validation of authentication request data

Passwords must contain between **8 and 72 characters**, in accordance with the bcrypt password-length limitation used by the application.

Invalid requests are rejected with an appropriate HTTP `400 Bad Request` response.

Relevant implementation:

```text
backend/src/validators/authValidators.js
backend/src/middleware/validate.js
```

---

## Secure Error Handling (Expressjs, 2025; OWASP, 2024)

HustleHub+ uses centralized error handling to prevent sensitive implementation details from being exposed to users.

The error handler:

- Logs detailed error information on the server.
- Returns short, controlled JSON error messages to clients.
- Prevents stack traces from being exposed.
- Prevents internal file paths from being exposed.
- Prevents configuration values from being returned to clients.

Relevant implementation:

```text
backend/src/middleware/errorHandler.js
```

This helps prevent attackers from obtaining unnecessary information about the internal structure of the application.

---

## HTTPS/TLS (Expressjs, 2025; Node.js, 2025)

The API supports HTTPS using Node.js's built-in HTTPS server.

The HTTPS server is configured in:

```text
backend/src/server.js
```

Local development certificates can be generated using:

```bash
npm run generate-certs
```

HTTPS encrypts communication between the client and API, helping protect credentials, authentication tokens, and other sensitive information while in transit.

### Localhost Certificate Warning

Because the development environment uses a **self-signed certificate**, browsers and tools such as Postman may display a certificate warning.

This is expected when running the application locally.

For production deployment, a certificate issued by a trusted Certificate Authority should be used.

---

## Security Headers

Hustle Hub+ uses **Helmet** to configure HTTP security headers.

These headers provide additional protection against several common web-based attacks and help establish safer browser security policies.

---

## Rate Limiting

Rate limiting is implemented on authentication endpoints such as:

- Login
- Registration

This helps reduce the risk of automated abuse and repeated authentication attempts.

---

## Secure Logging

Application logging is implemented with security and privacy in mind.

Sensitive authentication information is **not written to logs**, including:

- Passwords
- JWTs
- Authentication credentials

This reduces the risk of sensitive information being exposed through application logs.

---

## Password Hashing (Charity, 2024)

This is implemented using the bycrypt.js library. It accepts a plain text password and then generated a secure hash using a cost of 12, also ensures that passwords are never stored in plain text, adhering to OWASP guidlines. 

---

## Password Verification

Compared a plain text password with a stored hash using bcrypt.compare and then returns a boolean, true if it matches the hash and false if it doesn't.

# Getting Started

## Prerequisites

Before running Hustle Hub+, ensure the following are installed:

- Node.js
- npm
- MongoDB
- Git

---

# Environment Variables

Sensitive configuration values should be stored in environment variables rather than directly in the source code.

Example:

```env
JWT_SECRET=your-secret-key
```

---

# Running the Application (Part 1)

Start the backend API:

```bash
 cd backend
 copy .env.example .env
``` 

 On macOS/Linux use cp .env.example .env. Open .env and replace JWT_SECRET with a random string of at least 32 characters.

```bash
 npm install
 npm run generate-certs
 npm start
```

The API listens on https://127.0.0.1:3443.

- Health check: GET https://127.0.0.1:3443/health
- Register: POST https://127.0.0.1:3443/api/auth/register
- Login: POST https://127.0.0.1:3443/api/auth/login
- Current user (JWT required): GET https://127.0.0.1:3443/api/me
- The TLS certificate is self-signed. In Postman, turn off SSL certificate verification for local requests.

---

# Demo Video

The Part 1 demonstration of the HTTPS API (health check, register, login, and the protected current-user route) is on YouTube:

https://youtu.be/ZT6XeQMRhIE

---

# Security References

The security design of Hustle Hub+ was informed by established security guidance and standards, including:

- OWASP security guidance
- JWT security best practices
- Express.js security recommendations
- Node.js HTTPS documentation

---

# Authors

Sihle, Nomathansanqa, Lesedi and Blessing.

# Reference List:

Sources used for Part 1 security and backend decisions.
- Expressjs (2025) *Production best practices: security*. Available at: https://expressjs.com/en/advanced/best-practice-security.html (Accessed: 4 September 2026).
- Grassi, P.A., Garcia, M.E. and Fenton, J.L. (2017) *Digital identity guidelines: authentication and lifecycle management*. NIST Special Publication 800-63B. Gaithersburg: National Institute of Standards and Technology. Available at: https://doi.org/10.6028/NIST.SP.800-63b (Accessed: 4 September 2026). 
- Helmetjs (2025) *Helmet: help secure Express apps with HTTP response headers*. Available at: https://helmetjs.github.io/ (Accessed: 4 September 2026).
- Node.js (2025) *HTTPS*. Available at: https://nodejs.org/api/https.html (Accessed: 4 September 2026).
- OWASP (2024) *Improper error handling*. Available at: https://owasp.org/www-community/Improper_Error_Handling (Accessed: 4 September 2026).
- OWASP (2025a) *Authentication cheat sheet*. Available at: https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html (Accessed: 4 September 2026).
- OWASP (2025b) *Logging cheat sheet*. Available at: https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html (Accessed: 4 September 2026).
- OWASP (2025c) *Input validation cheat sheet*. Available at: https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html (Accessed: 4 September 2026).
- OWASP (2025d) *Password storage cheat sheet*. Available at: https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html (Accessed: 4 September 2026).
- Sheffer, Y., Hardt, D. and Jones, M. (2020) *JSON Web Token best current practices*. RFC 8725. Internet Engineering Task Force. Available at: https://www.rfc-editor.org/rfc/rfc8725 (Accessed: 4 September 2026).
- Charity, D.T. (2024) How to Hash Passwords with bcrypt in Node.js, freecodecamp.org. Available at: https://www.freecodecamp.org/news/how-to-hash-passwords-with-bcrypt-in-nodejs/ (Accessed: September 7, 2026).
- Kath, H. (2021) “What is SSL, TLS, and HTTPS?,” https://www.goanywhere.com/, 13 January. Available at: https://www.goanywhere.com/blog/what-is-ssl-tls-and-https.
- MongoDB (2026) MERN stack explained, Mongodb.com. Available at: https://www.mongodb.com/resources/languages/mern-stack (Accessed: September 7, 2026).
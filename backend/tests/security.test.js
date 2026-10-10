/**
 * Security tests: authentication, RBAC and ownership, input sanitisation,
 * secure errors, security headers and rate limiting.
 */

const request = require('supertest');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const JWT_SECRET = 'test-secret-that-is-at-least-32-characters-long';
process.env.JWT_SECRET = JWT_SECRET;

const app = require('../src/app');
const { connectDb, disconnectDb } = require('../src/config/db');

let mongod;

const gigBody = {
  title: 'Logo design',
  description: 'I will design a clean modern logo for you.',
  category: 'Design',
  price: 250,
  deliveryDays: 3,
};

async function registerUser(email, role) {
  const res = await request(app)
    .post('/api/auth/register')
    .send({ email, password: 'StrongPass123!', fullName: 'Test User', role });
  return { token: res.body.token, user: res.body.user };
}

const bearer = (token) => ({ Authorization: `Bearer ${token}` });

function base64url(value) {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await connectDb(mongod.getUri());
});

afterAll(async () => {
  await disconnectDb();
  await mongod.stop();
});

beforeEach(async () => {
  await mongoose.connection.db.dropDatabase();
});

describe('JWT protection', () => {
  const protectedRoutes = [
    ['get', '/api/me'],
    ['get', '/api/gigs'],
    ['post', '/api/gigs'],
    ['post', '/api/bookings'],
    ['get', '/api/bookings/mine'],
    ['get', '/api/transactions/mine'],
    ['get', '/api/transactions/income'],
  ];

  test.each(protectedRoutes)('%s %s without a token returns 401', async (method, path) => {
    const res = await request(app)[method](path);
    expect(res.status).toBe(401);
  });

  test('rejects a token whose payload was tampered with', async () => {
    const { token } = await registerUser('c@example.com', 'client');
    const [header, payload, signature] = token.split('.');
    const claims = JSON.parse(Buffer.from(payload, 'base64url').toString());
    const forged = `${header}.${base64url({ ...claims, role: 'freelancer' })}.${signature}`;

    const res = await request(app).post('/api/gigs').set(bearer(forged)).send(gigBody);
    expect(res.status).toBe(401);
  });

  test('rejects an unsigned "alg: none" token', async () => {
    const { user } = await registerUser('c@example.com', 'client');
    const unsigned = `${base64url({ alg: 'none', typ: 'JWT' })}.${base64url({
      sub: user.id,
      role: 'freelancer',
      iss: 'hustlehub-api',
      aud: 'hustlehub-web',
    })}.`;

    const res = await request(app).get('/api/me').set(bearer(unsigned));
    expect(res.status).toBe(401);
  });

  test('rejects tokens with the wrong issuer, wrong audience or an unknown role', async () => {
    const { user } = await registerUser('c@example.com', 'client');
    const claims = { sub: user.id, role: 'client' };

    const wrongIssuer = jwt.sign(claims, JWT_SECRET, { issuer: 'evil', audience: 'hustlehub-web' });
    const wrongAudience = jwt.sign(claims, JWT_SECRET, { issuer: 'hustlehub-api', audience: 'other' });
    const unknownRole = jwt.sign({ ...claims, role: 'superuser' }, JWT_SECRET, {
      issuer: 'hustlehub-api',
      audience: 'hustlehub-web',
    });

    for (const token of [wrongIssuer, wrongAudience, unknownRole]) {
      const res = await request(app).get('/api/me').set(bearer(token));
      expect(res.status).toBe(401);
    }
  });

  test('rejects an expired token', async () => {
    const { user } = await registerUser('c@example.com', 'client');
    const expired = jwt.sign({ sub: user.id, role: 'client' }, JWT_SECRET, {
      issuer: 'hustlehub-api',
      audience: 'hustlehub-web',
      expiresIn: -10,
    });

    const res = await request(app).get('/api/me').set(bearer(expired));
    expect(res.status).toBe(401);
    expect(res.body.error.message).toBe('Invalid or expired token');
  });
});

describe('role-based access control and ownership', () => {
  test('a client cannot create, update or delete gigs', async () => {
    const freelancer = await registerUser('f@example.com', 'freelancer');
    const client = await registerUser('c@example.com', 'client');
    const gig = await request(app).post('/api/gigs').set(bearer(freelancer.token)).send(gigBody);
    const id = gig.body.gig.id;

    const create = await request(app).post('/api/gigs').set(bearer(client.token)).send(gigBody);
    const update = await request(app).put(`/api/gigs/${id}`).set(bearer(client.token)).send({ price: 1 });
    const remove = await request(app).delete(`/api/gigs/${id}`).set(bearer(client.token));

    expect([create.status, update.status, remove.status]).toEqual([403, 403, 403]);
  });

  test('a freelancer cannot book gigs or read the client-only booking flow', async () => {
    const owner = await registerUser('f1@example.com', 'freelancer');
    const other = await registerUser('f2@example.com', 'freelancer');
    const gig = await request(app).post('/api/gigs').set(bearer(owner.token)).send(gigBody);

    const res = await request(app)
      .post('/api/bookings')
      .set(bearer(other.token))
      .send({ gigId: gig.body.gig.id });
    expect(res.status).toBe(403);
  });

  test('a client cannot view the freelancer income summary', async () => {
    const client = await registerUser('c@example.com', 'client');
    const res = await request(app).get('/api/transactions/income').set(bearer(client.token));
    expect(res.status).toBe(403);
  });

  test('users cannot view bookings they are not part of', async () => {
    const freelancer = await registerUser('f@example.com', 'freelancer');
    const outsiderFreelancer = await registerUser('f2@example.com', 'freelancer');
    const client = await registerUser('c@example.com', 'client');
    const otherClient = await registerUser('c2@example.com', 'client');

    const gig = await request(app).post('/api/gigs').set(bearer(freelancer.token)).send(gigBody);
    const booking = await request(app)
      .post('/api/bookings')
      .set(bearer(client.token))
      .send({ gigId: gig.body.gig.id });
    const path = `/api/bookings/${booking.body.booking.id}`;

    expect((await request(app).get(path).set(bearer(client.token))).status).toBe(200);
    expect((await request(app).get(path).set(bearer(freelancer.token))).status).toBe(200);
    expect((await request(app).get(path).set(bearer(otherClient.token))).status).toBe(404);
    expect((await request(app).get(path).set(bearer(outsiderFreelancer.token))).status).toBe(404);

    const otherList = await request(app).get('/api/bookings/mine').set(bearer(otherClient.token));
    expect(otherList.body.bookings).toHaveLength(0);
    const otherTx = await request(app).get('/api/transactions/mine').set(bearer(otherClient.token));
    expect(otherTx.body.transactions).toHaveLength(0);
  });

  test('a client cannot set the booking price or the freelancer', async () => {
    const freelancer = await registerUser('f@example.com', 'freelancer');
    const client = await registerUser('c@example.com', 'client');
    const gig = await request(app).post('/api/gigs').set(bearer(freelancer.token)).send(gigBody);

    const res = await request(app)
      .post('/api/bookings')
      .set(bearer(client.token))
      .send({ gigId: gig.body.gig.id, price: 1, freelancer: client.user.id });
    expect(res.status).toBe(400);
  });
});

describe('input validation and sanitisation', () => {
  test('rejects NoSQL operator injection in the login body', async () => {
    await registerUser('c@example.com', 'client');
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: { $gt: '' }, password: { $gt: '' } });
    expect(res.status).toBe(400);
    expect(res.body.token).toBeUndefined();
  });

  test('rejects dotted keys and prototype pollution keys', async () => {
    const dotted = await request(app)
      .post('/api/auth/login')
      .send({ 'email.address': 'c@example.com', password: 'StrongPass123!' });
    expect(dotted.status).toBe(400);

    const polluted = await request(app)
      .post('/api/auth/login')
      .set('Content-Type', 'application/json')
      .send('{"email":"c@example.com","password":"x","__proto__":{"role":"admin"}}');
    expect(polluted.status).toBe(400);
  });

  test('rejects NoSQL operators in query strings', async () => {
    const { token } = await registerUser('c@example.com', 'client');
    const res = await request(app).get('/api/gigs?search[$regex]=.*').set(bearer(token));
    expect(res.status).toBe(400);
  });

  test('escapes HTML in stored text so scripts cannot run in the UI', async () => {
    const { token } = await registerUser('f@example.com', 'freelancer');
    const res = await request(app)
      .post('/api/gigs')
      .set(bearer(token))
      .send({ ...gigBody, title: '<script>alert(1)</script>' });

    expect(res.status).toBe(201);
    expect(res.body.gig.title).not.toContain('<script>');
    expect(res.body.gig.title).toContain('&lt;script&gt;');
  });

  test('rejects unexpected fields such as a self-assigned role escalation', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'x@example.com', password: 'StrongPass123!', fullName: 'X Y', role: 'client', isAdmin: true });
    expect(res.status).toBe(400);
  });

  test('rejects request bodies that are not JSON', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .type('form')
      .send('email=c@example.com&password=StrongPass123!');
    expect(res.status).toBe(415);
  });
});

describe('secure error handling', () => {
  test('malformed JSON returns a short 400 without internal details', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .set('Content-Type', 'application/json')
      .send('{"email": "c@example.com", ');

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: { message: 'Request body is not valid JSON' } });
    expect(JSON.stringify(res.body)).not.toMatch(/at |node_modules|\\|\/src\//);
  });

  test('oversized bodies are rejected with 413', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'c@example.com', password: 'x'.repeat(20000) });
    expect(res.status).toBe(413);
  });

  test('unknown routes return a generic 404', async () => {
    const res = await request(app).get('/api/does-not-exist');
    expect(res.status).toBe(404);
    expect(res.body.error.message).toBe('The requested resource was not found');
  });
});

describe('security headers', () => {
  test('sets CSP and other protective headers and hides the framework', async () => {
    const res = await request(app).get('/health');

    expect(res.headers['content-security-policy']).toContain("default-src 'none'");
    expect(res.headers['content-security-policy']).toContain("frame-ancestors 'none'");
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-frame-options']).toBe('DENY');
    expect(res.headers['referrer-policy']).toBe('no-referrer');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });

  test('API responses are marked as not cacheable', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'bad', password: '' });
    expect(res.headers['cache-control']).toBe('no-store');
  });
});

describe('rate limiting', () => {
  test('authentication endpoints return 429 after too many attempts', async () => {
    let limitedApp;
    process.env.AUTH_RATE_LIMIT_MAX = '3';
    jest.isolateModules(() => {
      limitedApp = require('../src/app');
    });
    delete process.env.AUTH_RATE_LIMIT_MAX;

    const attempt = () => request(limitedApp)
      .post('/api/auth/login')
      .send({ email: 'nobody@example.com', password: '' });

    const statuses = [];
    for (let i = 0; i < 4; i += 1) {
      statuses.push((await attempt()).status);
    }

    expect(statuses.slice(0, 3)).toEqual([400, 400, 400]);
    expect(statuses[3]).toBe(429);

    const limited = await attempt();
    expect(limited.body.error.message).toMatch(/Too many authentication attempts/);
    expect(limited.headers.ratelimit || limited.headers['ratelimit-policy']).toBeDefined();
  });
});

const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

process.env.JWT_SECRET = 'test-secret-that-is-at-least-32-characters-long';

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
  return { token: res.body.token, user: res.body.user, res };
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

describe('authentication', () => {
  test('registers, never returns the hash, and stores a bcrypt hash', async () => {
    const { res } = await registerUser('a@example.com', 'freelancer');
    expect(res.status).toBe(201);
    expect(res.body.user.passwordHash).toBeUndefined();

    const stored = await mongoose.model('User').findOne({ email: 'a@example.com' });
    expect(stored.passwordHash).toMatch(/^\$2[aby]\$/);
  });

  test('rejects duplicate email with 409', async () => {
    await registerUser('a@example.com', 'client');
    const { res } = await registerUser('a@example.com', 'client');
    expect(res.status).toBe(409);
  });

  test('rejects self-registration as admin', async () => {
    const { res } = await registerUser('admin@example.com', 'admin');
    expect(res.status).toBe(400);
  });

  test('login succeeds with correct password and fails with wrong one', async () => {
    await registerUser('a@example.com', 'client');
    const ok = await request(app)
      .post('/api/auth/login')
      .send({ email: 'a@example.com', password: 'StrongPass123!' });
    expect(ok.status).toBe(200);
    expect(ok.body.token).toBeDefined();

    const bad = await request(app)
      .post('/api/auth/login')
      .send({ email: 'a@example.com', password: 'WrongPass123!' });
    expect(bad.status).toBe(401);
  });

  test('GET /api/me returns the current user', async () => {
    const { token } = await registerUser('a@example.com', 'client');
    const res = await request(app).get('/api/me').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe('a@example.com');
  });
});

describe('gig RBAC and ownership', () => {
  test('requires a token', async () => {
    const res = await request(app).get('/api/gigs');
    expect(res.status).toBe(401);
  });

  test('client cannot create a gig (403)', async () => {
    const { token } = await registerUser('c@example.com', 'client');
    const res = await request(app).post('/api/gigs').set('Authorization', `Bearer ${token}`).send(gigBody);
    expect(res.status).toBe(403);
  });

  test('freelancer creates a gig owned by themselves, ignoring body owner', async () => {
    const { token, user } = await registerUser('f@example.com', 'freelancer');
    const res = await request(app).post('/api/gigs').set('Authorization', `Bearer ${token}`).send(gigBody);
    expect(res.status).toBe(201);
    expect(res.body.gig.freelancer.id).toBe(user.id);

    const withOwner = await request(app)
      .post('/api/gigs')
      .set('Authorization', `Bearer ${token}`)
      .send({ ...gigBody, freelancer: 'someone-else' });
    expect(withOwner.status).toBe(400);
  });

  test('rejects invalid gig input', async () => {
    const { token } = await registerUser('f@example.com', 'freelancer');
    const res = await request(app)
      .post('/api/gigs')
      .set('Authorization', `Bearer ${token}`)
      .send({ ...gigBody, price: -5, title: 'x' });
    expect(res.status).toBe(400);
  });

  test('client browses active gigs; inactive ones are hidden', async () => {
    const f = await registerUser('f@example.com', 'freelancer');
    const c = await registerUser('c@example.com', 'client');
    const auth = { Authorization: `Bearer ${f.token}` };

    await request(app).post('/api/gigs').set(auth).send(gigBody);
    const hidden = await request(app).post('/api/gigs').set(auth).send({ ...gigBody, title: 'Hidden gig' });
    await request(app).put(`/api/gigs/${hidden.body.gig.id}`).set(auth).send({ isActive: false });

    const list = await request(app).get('/api/gigs').set('Authorization', `Bearer ${c.token}`);
    expect(list.status).toBe(200);
    expect(list.body.total).toBe(1);

    const direct = await request(app)
      .get(`/api/gigs/${hidden.body.gig.id}`)
      .set('Authorization', `Bearer ${c.token}`);
    expect(direct.status).toBe(404);
  });

  test('freelancer cannot update or delete another freelancer\'s gig (403)', async () => {
    const owner = await registerUser('f1@example.com', 'freelancer');
    const other = await registerUser('f2@example.com', 'freelancer');
    const created = await request(app)
      .post('/api/gigs')
      .set('Authorization', `Bearer ${owner.token}`)
      .send(gigBody);
    const id = created.body.gig.id;

    const put = await request(app)
      .put(`/api/gigs/${id}`)
      .set('Authorization', `Bearer ${other.token}`)
      .send({ price: 1 });
    expect(put.status).toBe(403);

    const del = await request(app).delete(`/api/gigs/${id}`).set('Authorization', `Bearer ${other.token}`);
    expect(del.status).toBe(403);

    const stillThere = await request(app).get(`/api/gigs/${id}`).set('Authorization', `Bearer ${owner.token}`);
    expect(stillThere.body.gig.price).toBe(250);
  });

  test('owner can update and delete their own gig', async () => {
    const owner = await registerUser('f1@example.com', 'freelancer');
    const auth = { Authorization: `Bearer ${owner.token}` };
    const created = await request(app).post('/api/gigs').set(auth).send(gigBody);
    const id = created.body.gig.id;

    const put = await request(app).put(`/api/gigs/${id}`).set(auth).send({ price: 300 });
    expect(put.status).toBe(200);
    expect(put.body.gig.price).toBe(300);

    const mine = await request(app).get('/api/gigs/mine').set(auth);
    expect(mine.body.gigs).toHaveLength(1);

    const del = await request(app).delete(`/api/gigs/${id}`).set(auth);
    expect(del.status).toBe(200);
    const gone = await request(app).get(`/api/gigs/${id}`).set(auth);
    expect(gone.status).toBe(404);
  });

  test('rejects malformed ids and NoSQL operator payloads', async () => {
    const { token } = await registerUser('f@example.com', 'freelancer');
    const auth = { Authorization: `Bearer ${token}` };

    const badId = await request(app).get('/api/gigs/not-an-id').set(auth);
    expect(badId.status).toBe(400);

    const injected = await request(app).get('/api/gigs?category[$ne]=x').set(auth);
    expect(injected.status).toBe(400);
  });
});

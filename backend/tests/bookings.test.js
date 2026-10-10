/**
 * Booking, transaction and income tests.
 */

const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

process.env.JWT_SECRET = 'test-secret-that-is-at-least-32-characters-long';
process.env.BOOKING_RATE_LIMIT_MAX = '5';

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

async function registerUser(email, role, fullName = 'Test User') {
  const res = await request(app)
    .post('/api/auth/register')
    .send({ email, password: 'StrongPass123!', fullName, role });
  return { token: res.body.token, user: res.body.user };
}

const bearer = (token) => ({ Authorization: `Bearer ${token}` });

async function createGig(token, overrides = {}) {
  const res = await request(app).post('/api/gigs').set(bearer(token)).send({ ...gigBody, ...overrides });
  return res.body.gig;
}

function book(token, gigId, notes) {
  return request(app).post('/api/bookings').set(bearer(token)).send(notes ? { gigId, notes } : { gigId });
}

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await connectDb(mongod.getUri());
});

afterAll(async () => {
  delete process.env.BOOKING_RATE_LIMIT_MAX;
  await disconnectDb();
  await mongod.stop();
});

beforeEach(async () => {
  await mongoose.connection.db.dropDatabase();
});

describe('creating bookings', () => {
  test('a client books a gig and exactly one linked transaction is recorded', async () => {
    const freelancer = await registerUser('f@example.com', 'freelancer', 'Fiona Freelancer');
    const client = await registerUser('c@example.com', 'client', 'Carl Client');
    const gig = await createGig(freelancer.token);

    const res = await book(client.token, gig.id, 'Please use blue tones.');

    expect(res.status).toBe(201);
    const { booking } = res.body;
    expect(booking.status).toBe('confirmed');
    expect(booking.confirmationReference).toMatch(/^HH-[0-9A-F]{8}$/);
    expect(booking.price).toBe(250);
    expect(booking.client).toEqual({ id: client.user.id, fullName: 'Carl Client' });
    expect(booking.freelancer).toEqual({ id: freelancer.user.id, fullName: 'Fiona Freelancer' });
    expect(booking.transaction.amount).toBe(250);

    const transactions = await mongoose.model('Transaction').find({});
    expect(transactions).toHaveLength(1);
    expect(transactions[0].booking.toString()).toBe(booking.id);
    expect(transactions[0].gig.toString()).toBe(gig.id);
    expect(transactions[0].client.toString()).toBe(client.user.id);
    expect(transactions[0].freelancer.toString()).toBe(freelancer.user.id);
  });

  test('the price comes from the stored gig at booking time', async () => {
    const freelancer = await registerUser('f@example.com', 'freelancer');
    const client = await registerUser('c@example.com', 'client');
    const gig = await createGig(freelancer.token, { price: 400 });

    const first = await book(client.token, gig.id);
    await request(app).put(`/api/gigs/${gig.id}`).set(bearer(freelancer.token)).send({ price: 500 });
    const second = await book(client.token, gig.id);

    expect(first.body.booking.price).toBe(400);
    expect(second.body.booking.price).toBe(500);
  });

  test('inactive, missing and malformed gigs cannot be booked', async () => {
    const freelancer = await registerUser('f@example.com', 'freelancer');
    const client = await registerUser('c@example.com', 'client');
    const gig = await createGig(freelancer.token);
    await request(app).put(`/api/gigs/${gig.id}`).set(bearer(freelancer.token)).send({ isActive: false });

    expect((await book(client.token, gig.id)).status).toBe(404);
    expect((await book(client.token, new mongoose.Types.ObjectId().toString())).status).toBe(404);
    expect((await book(client.token, 'not-an-id')).status).toBe(400);
    expect(await mongoose.model('Transaction').countDocuments()).toBe(0);
  });

  test('booking notes are escaped', async () => {
    const freelancer = await registerUser('f@example.com', 'freelancer');
    const client = await registerUser('c@example.com', 'client');
    const gig = await createGig(freelancer.token);

    const res = await book(client.token, gig.id, '<img src=x onerror=alert(1)>');
    expect(res.status).toBe(201);
    expect(res.body.booking.notes).not.toContain('<img');
  });
});

describe('viewing bookings, transactions and income', () => {
  test('clients see their bookings and freelancers see bookings on their gigs', async () => {
    const freelancer = await registerUser('f@example.com', 'freelancer');
    const client = await registerUser('c@example.com', 'client');
    const gig = await createGig(freelancer.token);
    await book(client.token, gig.id);

    const clientView = await request(app).get('/api/bookings/mine').set(bearer(client.token));
    const freelancerView = await request(app).get('/api/bookings/mine').set(bearer(freelancer.token));

    expect(clientView.body.bookings).toHaveLength(1);
    expect(freelancerView.body.bookings).toHaveLength(1);
    expect(freelancerView.body.bookings[0].gig.title).toBe('Logo design');
    expect(freelancerView.body.bookings[0].transaction.amount).toBe(250);
  });

  test('income is tracked per freelancer from their transactions only', async () => {
    const fiona = await registerUser('f1@example.com', 'freelancer');
    const frank = await registerUser('f2@example.com', 'freelancer');
    const client = await registerUser('c@example.com', 'client');
    const fionaGig = await createGig(fiona.token, { price: 300 });
    const frankGig = await createGig(frank.token, { price: 1000 });

    await book(client.token, fionaGig.id);
    await book(client.token, fionaGig.id);
    await book(client.token, frankGig.id);

    const fionaIncome = await request(app).get('/api/transactions/income').set(bearer(fiona.token));
    expect(fionaIncome.status).toBe(200);
    expect(fionaIncome.body.income.totalIncome).toBe(600);
    expect(fionaIncome.body.income.transactionCount).toBe(2);
    expect(fionaIncome.body.income.monthly).toHaveLength(1);
    expect(fionaIncome.body.income.monthly[0].income).toBe(600);

    const frankIncome = await request(app).get('/api/transactions/income').set(bearer(frank.token));
    expect(frankIncome.body.income.totalIncome).toBe(1000);

    const clientTx = await request(app).get('/api/transactions/mine').set(bearer(client.token));
    expect(clientTx.body.transactions).toHaveLength(3);
    const fionaTx = await request(app).get('/api/transactions/mine').set(bearer(fiona.token));
    expect(fionaTx.body.transactions).toHaveLength(2);
  });

  test('a freelancer with no bookings has zero income', async () => {
    const freelancer = await registerUser('f@example.com', 'freelancer');
    const res = await request(app).get('/api/transactions/income').set(bearer(freelancer.token));
    expect(res.body.income).toEqual({ currency: 'ZAR', totalIncome: 0, transactionCount: 0, monthly: [] });
  });
});

describe('booking rate limit', () => {
  test('each client is limited separately and gets 429 when over the limit', async () => {
    const freelancer = await registerUser('f@example.com', 'freelancer');
    const busyClient = await registerUser('c1@example.com', 'client');
    const otherClient = await registerUser('c2@example.com', 'client');
    const gig = await createGig(freelancer.token);

    const statuses = [];
    for (let i = 0; i < 6; i += 1) {
      statuses.push((await book(busyClient.token, gig.id)).status);
    }

    expect(statuses.slice(0, 5)).toEqual([201, 201, 201, 201, 201]);
    expect(statuses[5]).toBe(429);
    expect((await book(otherClient.token, gig.id)).status).toBe(201);
    expect(await mongoose.model('Transaction').countDocuments()).toBe(6);
  });
});

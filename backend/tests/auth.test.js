const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');

jest.setTimeout(120000);

let mongod;
let app;

beforeAll(async () => {
  process.env.JWT_ACCESS_SECRET = 'test-access-secret-min-32-characters!!';
  process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-min-32-characters!';
  process.env.NODE_ENV = 'test';
  mongod = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongod.getUri();
  // Load app after env is set so JWT secrets are stable
  // eslint-disable-next-line global-require
  const { createApp } = require('../src/app');
  await mongoose.connect(process.env.MONGODB_URI);
  app = createApp();
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongod) await mongod.stop();
});

describe('Auth + ownership', () => {
  let tokensA;
  let tokensB;

  test('register and login', async () => {
    const reg = await request(app).post('/api/auth/register').send({
      email: 'a@example.com',
      password: 'Password123!',
      name: 'User A',
    });
    expect(reg.status).toBe(201);
    tokensA = reg.body.data;

    const login = await request(app).post('/api/auth/login').send({
      email: 'a@example.com',
      password: 'Password123!',
    });
    expect(login.status).toBe(200);
    expect(login.body.data.accessToken).toBeTruthy();
  });

  test('forgot password does not reveal account existence', async () => {
    const res = await request(app).post('/api/auth/forgot-password').send({ email: 'missing@example.com' });
    expect(res.status).toBe(200);
    expect(res.body.data.message).toMatch(/If an account exists/);
  });

  test('user B cannot read user A expense', async () => {
    const create = await request(app)
      .post('/api/expenses')
      .set('Authorization', `Bearer ${tokensA.accessToken}`)
      .send({
        clientId: 'exp-a-1',
        amountCents: 180000,
        occurredAt: new Date().toISOString(),
        categoryName: 'Fuel',
        note: 'test',
      });
    expect(create.status).toBe(201);

    const regB = await request(app).post('/api/auth/register').send({
      email: 'b@example.com',
      password: 'Password123!',
      name: 'User B',
    });
    tokensB = regB.body.data;

    const steal = await request(app)
      .get(`/api/expenses/${create.body.data.clientId}`)
      .set('Authorization', `Bearer ${tokensB.accessToken}`);
    expect(steal.status).toBe(404);
  });

  test('profit calculation via dashboard', async () => {
    await request(app)
      .post('/api/income')
      .set('Authorization', `Bearer ${tokensA.accessToken}`)
      .send({
        clientId: 'inc-a-1',
        amountCents: 550000,
        occurredAt: new Date().toISOString(),
        categoryName: 'Rides',
      });

    const dash = await request(app)
      .get('/api/dashboard')
      .set('Authorization', `Bearer ${tokensA.accessToken}`);
    expect(dash.status).toBe(200);
    expect(dash.body.data.today.incomeCents).toBe(550000);
    expect(dash.body.data.today.expenseCents).toBe(180000);
    expect(dash.body.data.today.profitCents).toBe(370000);
  });
});

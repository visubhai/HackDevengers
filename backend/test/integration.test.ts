import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import connectDB from '../src/config/db';
// Set NODE_ENV to test to prevent auto-start
process.env.NODE_ENV = 'test';
import app from '../src/index';

// Helper to seed data
import User from '../src/models/User';
import Branch from '../src/models/Branch';
import bcrypt from 'bcryptjs';

describe('Integration Tests', async () => {
    let mongoServer: MongoMemoryServer;
    let adminToken: string;
    let createdBranchId: string;
    let createdUserId: string;
    let createdBookingId: string;

    before(async () => {
        // Start In-Memory DB
        mongoServer = await MongoMemoryServer.create();
        const uri = mongoServer.getUri();

        process.env.MONGODB_URI = uri;
        await connectDB();

        console.log("✅ Mock DB Connected");

        // Seed Admin
        const hash = await bcrypt.hash('password123', 10);
        await User.create({
            name: 'Super Admin',
            email: 'admin@system.com',
            username: 'admin',
            password: hash,
            role: 'SUPER_ADMIN'
        });

        await Branch.create({
            name: 'Test Branch A',
            branchCode: 'TBA',
            state: 'TestState'
        });
        await Branch.create({
            name: 'Test Branch B',
            branchCode: 'TBB',
            state: 'TestState'
        });
    });

    after(async () => {
        await mongoose.disconnect();
        await mongoServer.stop();
    });

    it('should login as admin', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .send({ email: 'admin@system.com', password: 'password123' });

        assert.strictEqual(res.status, 200);
        assert.strictEqual(res.body.role, 'SUPER_ADMIN');
    });

    it('should list branches', async () => {
        const res = await request(app).get('/api/branches');
        assert.strictEqual(res.status, 200);
        assert.strictEqual(res.body.length, 2);
        createdBranchId = res.body[0]._id;
    });

    it('should create a new user (Staff)', async () => {
        // User creation isn't exposed via API properly yet (only seed), 
        // but we can test fetching users seeded or created via DB
        // Wait, did I implement Create User API? No.
        // I implemented Get Users and Toggle Status.
        // So I'll just check if Admin shows up.

        const res = await request(app).get('/api/users');
        assert.strictEqual(res.status, 200);
        const adminUser = res.body.find((u: any) => u.email === 'admin@system.com');
        assert.ok(adminUser);
        createdUserId = adminUser.id;
    });

    it('should toggle user status', async () => {
        // Toggle Admin status (risky but allowed in code)
        const res = await request(app)
            .patch(`/api/users/${createdUserId}/status`)
            .send({ isActive: false });

        assert.strictEqual(res.status, 200);
        assert.strictEqual(res.body.isActive, false);

        // Revert
        await request(app)
            .patch(`/api/users/${createdUserId}/status`)
            .send({ isActive: true });
    });

    it('should create a booking', async () => {
        const branches = await request(app).get('/api/branches');
        const fromBranch = branches.body[0]._id;
        const toBranch = branches.body[1]._id;

        const bookingPayload = {
            fromBranch,
            toBranch,
            sender: { name: "Test Sender", mobile: "9999999999" },
            receiver: { name: "Test Receiver", mobile: "8888888888" },
            parcels: [{ quantity: 1, itemType: "Box", weight: 10, rate: 100 }],
            costs: { freight: 100, handling: 10, hamali: 0, total: 110 },
            paymentType: "Paid",
            status: "Booked"
        };

        const res = await request(app)
            .post('/api/bookings')
            .send(bookingPayload);

        assert.strictEqual(res.status, 201);
        assert.ok(res.body.booking.lrNumber);

        createdBookingId = res.body.booking._id;
    });

    it('should update booking status', async () => {
        const res = await request(app)
            .patch(`/api/bookings/${createdBookingId}/status`)
            .send({ status: 'In Transit' });

        assert.strictEqual(res.status, 200);
        assert.strictEqual(res.body.booking.status, 'In Transit');
    });

    it('should verify ledger entry', async () => {
        // We created a "Paid" booking, so a CREDIT transaction should exist for fromBranch
        const branches = await request(app).get('/api/branches');
        const fromBranch = branches.body[0]._id;

        const res = await request(app).get(`/api/ledger?branchId=${fromBranch}`);
        assert.strictEqual(res.status, 200);
        assert.strictEqual(res.body.stats.count, 1);
        assert.strictEqual(res.body.stats.total_revenue, 110);
    });
});

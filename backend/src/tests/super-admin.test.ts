import request from 'supertest';
import app from '../index';
import User from '../models/User';
import { generateAuthToken } from '../scripts/setup-env';
import Branch from '../models/Branch';
import Booking from '../models/Booking';
import mongoose from 'mongoose';

describe('Super Admin Endpoints Integration', () => {
    let superAdminToken: string;
    let branchUserToken: string;
    let testBranchId: string;

    beforeEach(async () => {
        // Create Super Admin User
        const superAdmin = await User.create({
            name: 'Super Admin',
            username: 'superadmin' + Date.now(),
            email: `super${Date.now()}@test.com`,
            password: 'password123',
            role: 'SUPER_ADMIN',
            isActive: true
        });
        superAdminToken = generateAuthToken(superAdmin);

        // Create Branch for Tests
        const branch = await Branch.create({
            name: 'Test Super Branch',
            branchCode: 'TSB',
            state: 'Gujarat',
            isActive: true
        });
        testBranchId = (branch._id as any).toString();

        // Create Regular Branch User
        const branchUser = await User.create({
            name: 'Regular User',
            username: 'reguser' + Date.now(),
            email: `reg${Date.now()}@test.com`,
            password: 'password123',
            role: 'BRANCH',
            branchId: branch._id,
            isActive: true
        });
        branchUserToken = generateAuthToken(branchUser);
    });

    describe('Access Control', () => {
        it('should block regular branch user from accessing super admin dashboard', async () => {
            const response = await request(app)
                .get('/api/superadmin/dashboard-data')
                .set('Authorization', `Bearer ${branchUserToken}`);

            expect(response.status).toBe(403);
            expect(response.body.status).toBe('fail');
        });

        it('should allow super admin to access dashboard', async () => {
            const response = await request(app)
                .get('/api/superadmin/dashboard-data')
                .set('Authorization', `Bearer ${superAdminToken}`);

            expect(response.status).toBe(200);
            expect(response.body.status).toBe('success');
            expect(response.body.data.stats).toBeDefined();
        });
    });

    describe('Branch Permissions', () => {
        it('should create branch permissions', async () => {
            const response = await request(app)
                .post('/api/superadmin/permissions')
                .set('Authorization', `Bearer ${superAdminToken}`)
                .send({
                    branchId: testBranchId,
                    allowedReports: ["DAILY_REPORT", "SUMMARY_REPORT"]
                });

            expect(response.status).toBe(201);
            expect(response.body.status).toBe('success');
            expect(response.body.data.branchId).toBe(testBranchId);
        });

        it('should fetch branch permissions', async () => {
            // First create some permissions
            await request(app)
                .post('/api/superadmin/permissions')
                .set('Authorization', `Bearer ${superAdminToken}`)
                .send({
                    branchId: testBranchId,
                    allowedReports: ["DAILY_REPORT"]
                });

            const response = await request(app)
                .get(`/api/superadmin/permissions/${testBranchId}`)
                .set('Authorization', `Bearer ${superAdminToken}`);

            expect(response.status).toBe(200);
            expect(response.body.status).toBe('success');
            expect(response.body.data.branchId).toBe(testBranchId);
        });
    });

    describe('Booking Management', () => {
        let bookingId: string;

        beforeEach(async () => {
            const booking = await Booking.create({
                fromBranch: new mongoose.Types.ObjectId(testBranchId),
                toBranch: new mongoose.Types.ObjectId(testBranchId),
                senderBranchId: new mongoose.Types.ObjectId(testBranchId),
                receiverBranchId: new mongoose.Types.ObjectId(testBranchId),
                sender: { name: 'Sender', mobile: '1234567890' },
                receiver: { name: 'Receiver', mobile: '0987654321' },
                parcels: [{ quantity: 1, itemType: 'Box', rate: 100 }],
                costs: { freight: 1000, handling: 10, hamali: 0, total: 1010 },
                paymentType: 'Paid',
                status: 'PENDING',
                lrNumber: 'SA/1'
            });
            bookingId = (booking._id as any).toString();
        });

        it('should hard delete a booking', async () => {
            const response = await request(app)
                .delete(`/api/superadmin/bookings/${bookingId}`)
                .set('Authorization', `Bearer ${superAdminToken}`);

            expect(response.status).toBe(200);
            expect(response.body.status).toBe('success');

            const deletedBooking = await Booking.findById(bookingId);
            expect(deletedBooking).toBeNull();
        });
    });
});

// @ts-ignore
process.env.NODE_ENV = 'test';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.test' });

import request from 'supertest';
import app from '../index';
import mongoose from 'mongoose';
import Booking from '../models/Booking';
import Branch from '../models/Branch';
import User from '../models/User';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

describe('Booking Endpoints Integration', () => {
    let token: string;
    let branchId: string;
    let otherBranchId: string;
    let userId: string;

    beforeEach(async () => {
        // Create Test Branches
        const branch = await Branch.create({
            name: 'Test Origin Branch',
            branchCode: 'ORG',
            state: 'Gujarat',
            isActive: true
        });
        branchId = (branch._id as any).toString();

        const otherBranch = await Branch.create({
            name: 'Test Destination Branch',
            branchCode: 'DST',
            state: 'Gujarat',
            isActive: true
        });
        otherBranchId = (otherBranch._id as any).toString();

        // Create Test User
        const hashedPassword = await bcrypt.hash('password123', 12);
        const user = await User.create({
            name: 'Test User',
            email: 'test@example.com',
            username: 'testuser',
            password: hashedPassword,
            role: 'BRANCH',
            branchId: (branch._id as any),
            isActive: true
        });
        userId = (user._id as any).toString();

        // Generate Token
        token = jwt.sign({ id: userId }, process.env.JWT_SECRET!, {
            expiresIn: '1d'
        });
    });

    describe('POST /api/bookings', () => {
        it('should create a new booking successfully', async () => {
            const bookingData = {
                fromBranch: branchId,
                toBranch: otherBranchId,
                sender: { name: 'Sender Name', mobile: '1234567890' },
                receiver: { name: 'Receiver Name', mobile: '0987654321' },
                parcels: [{ quantity: 1, itemType: 'Box', rate: 100 }],
                costs: { freight: 1000, handling: 10, hamali: 0, total: 1010 },
                paymentType: 'Paid',
                remarks: 'Test shipment'
            };

            const response = await request(app)
                .post('/api/bookings')
                .set('Authorization', `Bearer ${token}`)
                .send(bookingData);

            if (response.status === 401) {
                console.log('401 Error Detail:', response.body);
            }

            expect(response.status).toBe(201);
            expect(response.body.status).toBe('success');
            expect(response.body.data.lrNumber).toBeDefined();
            expect(response.body.data.status).toBe('PENDING');
        });

        it('should fail if freight is negative', async () => {
            const invalidData = {
                fromBranch: branchId,
                toBranch: otherBranchId,
                sender: { name: 'Sender Name', mobile: '1234567890' },
                receiver: { name: 'Receiver Name', mobile: '0987654321' },
                parcels: [{ quantity: 1, itemType: 'Box', rate: 100 }],
                costs: { freight: -100, handling: 10, hamali: 0, total: -90 },
                paymentType: 'Paid'
            };

            const response = await request(app)
                .post('/api/bookings')
                .set('Authorization', `Bearer ${token}`)
                .send(invalidData);

            expect(response.status).toBe(400);
            expect(response.body.status).toBe('fail');
        });
    });

    describe('Booking Lifecycle', () => {
        let bookingId: string;

        beforeEach(async () => {
            const booking = await Booking.create({
                fromBranch: new mongoose.Types.ObjectId(branchId),
                toBranch: new mongoose.Types.ObjectId(otherBranchId),
                senderBranchId: new mongoose.Types.ObjectId(branchId),
                receiverBranchId: new mongoose.Types.ObjectId(otherBranchId),
                sender: { name: 'Sender', mobile: '1234567890' },
                receiver: { name: 'Receiver', mobile: '0987654321' },
                parcels: [{ quantity: 1, itemType: 'Box', rate: 100 }],
                costs: { freight: 1000, handling: 10, hamali: 0, total: 1010 },
                paymentType: 'Paid',
                status: 'PENDING',
                lrNumber: 'TST/1'
            });
            bookingId = (booking._id as any).toString();
        });

        it('should update booking status to DELIVERED with remarks', async () => {
            const response = await request(app)
                .patch(`/api/bookings/${bookingId}/status`)
                .set('Authorization', `Bearer ${token}`)
                .send({
                    status: 'DELIVERED',
                    deliveredRemark: 'Successfully delivered to receiver',
                    collectedBy: 'John Doe'
                });

            expect(response.status).toBe(200);
            expect(response.body.data.status).toBe('DELIVERED');
            expect(response.body.data.deliveredRemark).toBe('Successfully delivered to receiver');
        });

        it('should fail updating status to DELIVERED without remarks', async () => {
            const response = await request(app)
                .patch(`/api/bookings/${bookingId}/status`)
                .set('Authorization', `Bearer ${token}`)
                .send({
                    status: 'DELIVERED'
                });

            expect(response.status).toBe(400);
            expect(response.body.message).toMatch(/remarks are required/i);
        });
    });
});

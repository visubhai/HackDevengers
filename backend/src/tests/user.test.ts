import request from 'supertest';
import app from '../index';
import User from '../models/User';
import Branch from '../models/Branch';
import { generateAuthToken } from '../scripts/setup-env';

describe('User Endpoints', () => {
    let adminToken: string;
    let adminUser: any;
    let testBranch: any;

    beforeEach(async () => {
        testBranch = await Branch.create({
            name: 'User Test Branch',
            branchCode: 'UTB',
            state: 'Gujarat',
            isActive: true
        });

        adminUser = await User.create({
            name: 'Admin User',
            username: 'admin' + Date.now(),
            email: `admin${Date.now()}@test.com`,
            password: 'password123',
            role: 'SUPER_ADMIN',
            isActive: true
        });
        adminToken = generateAuthToken(adminUser);
    });

    it('should create a new user successfully', async () => {
        const response = await request(app)
            .post('/api/users')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
                name: 'New User',
                email: 'newuser@example.com',
                username: 'newuser',
                password: 'password123',
                role: 'BRANCH',
                branchId: testBranch._id.toString()
            });

        expect(response.status).toBe(201);
        expect(response.body.status).toBe('success');
        expect(response.body.data.username).toBe('newuser');
        expect(response.body.data.password).toBeUndefined();
    });

    it('should fetch all users', async () => {
        const response = await request(app)
            .get('/api/users')
            .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(200);
        expect(response.body.status).toBe('success');
        expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should update user status', async () => {
        const user = await User.create({
            name: 'Toggle User',
            email: 'toggle@example.com',
            username: 'toggleuser',
            password: 'password123',
            role: 'BRANCH',
            branchId: testBranch._id,
            isActive: true
        });

        const response = await request(app)
            .patch(`/api/users/${user._id}/status`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ isActive: false });

        expect(response.status).toBe(200);
        expect(response.body.data.isActive).toBe(false);
    });

    it('should reset user password', async () => {
        const user = await User.create({
            name: 'Reset User',
            email: 'reset@example.com',
            username: 'resetuser',
            password: 'password123',
            role: 'BRANCH',
            branchId: testBranch._id,
            isActive: true
        });

        const response = await request(app)
            .post(`/api/users/${user._id}/reset-password`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ password: 'newpassword123' });

        expect(response.status).toBe(200);
        expect(response.body.message).toBe('Password reset successful');
    });
});

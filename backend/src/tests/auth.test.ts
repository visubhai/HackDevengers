import request from 'supertest';
import app from '../index';
import User from '../models/User';
import bcrypt from 'bcryptjs';

describe('Auth Endpoints', () => {
    let testUser: any;
    const password = 'testpassword123';

    beforeEach(async () => {
        const hashedPassword = await bcrypt.hash(password, 12);
        testUser = await User.create({
            name: 'Auth Test User',
            email: 'authtest@example.com',
            username: 'authtest',
            password: hashedPassword,
            role: 'SUPER_ADMIN',
            isActive: true
        });
    });

    it('should login successfully with correct credentials', async () => {
        const response = await request(app)
            .post('/api/auth/login')
            .send({
                username: 'authtest',
                password: password
            });

        expect(response.status).toBe(200);
        expect(response.body.status).toBe('success');
        expect(response.body.data.accessToken).toBeDefined();
        expect(response.body.data.user.username).toBe('authtest');
        expect(response.header['set-cookie']).toBeDefined();
    });

    it('should fail login with incorrect credentials', async () => {
        const response = await request(app)
            .post('/api/auth/login')
            .send({
                username: 'authtest',
                password: 'wrongpassword'
            });

        expect(response.status).toBe(401);
        expect(response.body.status).toBe('fail');
    });

    it('should refresh token successfully', async () => {
        // 1. Login to get refresh cookie
        const loginRes = await request(app)
            .post('/api/auth/login')
            .send({
                username: 'authtest',
                password: password
            });

        const cookie = loginRes.header['set-cookie'];

        // 2. Call refresh
        const refreshRes = await request(app)
            .get('/api/auth/refresh')
            .set('Cookie', cookie);

        expect(refreshRes.status).toBe(200);
        expect(refreshRes.body.status).toBe('success');
        expect(refreshRes.body.data.accessToken).toBeDefined();
    });

    it('should logout successfully', async () => {
        // 1. Login to get refresh cookie
        const loginRes = await request(app)
            .post('/api/auth/login')
            .send({
                username: 'authtest',
                password: password
            });

        const cookie = loginRes.header['set-cookie'];

        // 2. Call logout
        const logoutRes = await request(app)
            .post('/api/auth/logout')
            .set('Cookie', cookie);

        expect(logoutRes.status).toBe(200);
        expect(logoutRes.body.status).toBe('success');

        // 3. Verify refresh cookie is cleared
        const clearedCookie = logoutRes.header['set-cookie'][0];
        expect(clearedCookie).toMatch(/jwt=;/);
    });
});

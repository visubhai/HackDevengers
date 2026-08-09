import request from 'supertest';
import app from '../index';
import Branch from '../models/Branch';
import User from '../models/User';
import { generateAuthToken } from '../scripts/setup-env';

describe('Branch Endpoints', () => {
    let adminToken: string;
    let adminUser: any;

    beforeEach(async () => {
        // Create an admin user for token generation
        adminUser = await User.create({
            name: 'Admin User',
            username: 'branchadmin' + Date.now(),
            email: `admin${Date.now()}@branchtest.com`,
            password: 'password123',
            role: 'SUPER_ADMIN',
            isActive: true
        });
        adminToken = generateAuthToken(adminUser);
    });

    it('should fetch branches successfully (public)', async () => {
        await Branch.create({
            name: 'Test Branch A',
            branchCode: 'TBA',
            state: 'Gujarat',
            isActive: true
        });

        const response = await request(app).get('/api/branches');
        expect(response.status).toBe(200);
        expect(response.body.status).toBe('success');
        expect(Array.isArray(response.body.data)).toBe(true);
        expect(response.body.data.some((b: any) => b.name === 'Test Branch A')).toBe(true);
    });

    it('should create a branch as admin', async () => {
        const response = await request(app)
            .post('/api/branches')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
                name: 'New Branch',
                branchCode: 'NBC',
                state: 'Gujarat',
                username: 'nbc_admin',
                password: 'password123'
            });

        expect(response.status).toBe(201);
        expect(response.body.data.name).toBe('New Branch');

        // Check if user was also created
        const user = await User.findOne({ username: 'nbc_admin' });
        expect(user).toBeDefined();
        expect(user?.branchId.toString()).toBe(response.body.data._id);
    });

    it('should fail creating branch without permissions', async () => {
        const response = await request(app)
            .post('/api/branches')
            .send({
                name: 'Unauthorized Branch',
                branchCode: 'UAB'
            });

        expect(response.status).toBe(401);
    });

    it('should update a branch', async () => {
        const branch = await Branch.create({
            name: 'Old Name',
            branchCode: 'OLD',
            state: 'Gujarat'
        });

        const response = await request(app)
            .put(`/api/branches/${branch._id}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
                name: 'Updated Name',
                isActive: false
            });

        expect(response.status).toBe(200);
        expect(response.body.data.name).toBe('Updated Name');
        expect(response.body.data.isActive).toBe(false);

        // Check if users were also deactivated
        await User.create({
            name: 'Old Admin',
            email: 'oldadmin@test.com',
            username: 'old_admin',
            password: 'password123',
            branchId: branch._id,
            isActive: true
        });

        // Trigger another update to test cascading deactivation
        await request(app)
            .put(`/api/branches/${branch._id}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ isActive: false });

        const users = await User.find({ branchId: branch._id });
        expect(users.every(u => u.isActive === false)).toBe(true);
    });

    it('should update a branch code and reflect username update', async () => {
        const branch = await Branch.create({
            name: 'Old Name',
            branchCode: 'OLD',
            state: 'Gujarat'
        });

        const user = await User.create({
            name: 'Old Name Admin',
            username: 'old',
            email: 'old@logiopen.com',
            password: 'password123',
            branchId: branch._id,
            isActive: true
        });

        const response = await request(app)
            .put(`/api/branches/${branch._id}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
                branchCode: 'NEWCODE'
            });

        expect(response.status).toBe(200);
        expect(response.body.data.branchCode).toBe('NEWCODE');

        // Check if user was also updated
        const updatedUser = await User.findById(user._id);
        expect(updatedUser?.username).toBe('newcode');
        expect(updatedUser?.email).toBe('newcode@logiopen.com');
    });

    it('should update a branch code and reflect username update even when old username is sent in payload', async () => {
        const branch = await Branch.create({
            name: 'Old Name',
            branchCode: 'OLD',
            state: 'Gujarat'
        });

        const user = await User.create({
            name: 'Old Name Admin',
            username: 'old',
            email: 'old@logiopen.com',
            password: 'password123',
            branchId: branch._id,
            isActive: true
        });

        const response = await request(app)
            .put(`/api/branches/${branch._id}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
                branchCode: 'NEWCODE',
                username: 'old' // simulate unchanged frontend username field
            });

        expect(response.status).toBe(200);
        expect(response.body.data.branchCode).toBe('NEWCODE');

        // Check if user was also updated
        const updatedUser = await User.findById(user._id);
        expect(updatedUser?.username).toBe('newcode');
        expect(updatedUser?.email).toBe('newcode@logiopen.com');
    });
});

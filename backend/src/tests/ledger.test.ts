import request from 'supertest';
import app from '../index';
import Transaction from '../models/Transaction';
import Branch from '../models/Branch';
import User from '../models/User';
import { generateAuthToken } from '../scripts/setup-env';

describe('Ledger Endpoints', () => {
    let adminToken: string;
    let branchToken: string;
    let testBranch: any;
    let otherBranch: any;

    beforeEach(async () => {
        testBranch = await Branch.create({
            name: 'Ledger Test Branch',
            branchCode: 'LTB',
            state: 'Gujarat',
            isActive: true
        });

        otherBranch = await Branch.create({
            name: 'Other Branch',
            branchCode: 'OTH',
            state: 'Gujarat',
            isActive: true
        });

        const adminUser = await User.create({
            name: 'Admin User',
            username: 'ledgeradmin' + Date.now(),
            email: `admin${Date.now()}@test.com`,
            password: 'password123',
            role: 'SUPER_ADMIN',
            isActive: true
        });
        adminToken = generateAuthToken(adminUser);

        const branchUser = await User.create({
            name: 'Branch User',
            username: 'ledgerbranch' + Date.now(),
            email: `branch${Date.now()}@test.com`,
            password: 'password123',
            role: 'BRANCH',
            branchId: testBranch._id,
            isActive: true
        });
        branchToken = generateAuthToken(branchUser);
    });

    it('should add a transaction successfully', async () => {
        const response = await request(app)
            .post('/api/ledger')
            .set('Authorization', `Bearer ${branchToken}`)
            .send({
                branchId: testBranch._id.toString(),
                type: 'CREDIT',
                amount: 500,
                description: 'Test Credit'
            });

        expect(response.status).toBe(201);
        expect(response.body.status).toBe('success');
        expect(response.body.data.amount).toBe(500);
    });

    it('should block branch user adding transaction for another branch', async () => {
        const response = await request(app)
            .post('/api/ledger')
            .set('Authorization', `Bearer ${branchToken}`)
            .send({
                branchId: otherBranch._id.toString(),
                type: 'CREDIT',
                amount: 500,
                description: 'Illegal Credit'
            });

        expect(response.status).toBe(403);
    });

    it('should fetch transactions with stats', async () => {
        await Transaction.create({
            branchId: testBranch._id,
            type: 'CREDIT',
            amount: 1000,
            description: 'Ref 1'
        });

        await Transaction.create({
            branchId: testBranch._id,
            type: 'DEBIT',
            amount: 200,
            description: 'Ref 2'
        });

        const response = await request(app)
            .get(`/api/ledger?branchId=${testBranch._id}`)
            .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(200);
        expect(response.body.status).toBe('success');
        expect(response.body.data.length).toBe(2);
        expect(response.body.meta.stats.total_revenue).toBe(1000);
    });

    it('should enforce branch restrictions on fetching transactions', async () => {
        // Branch user trying to fetch other branch's ledger
        const response = await request(app)
            .get(`/api/ledger?branchId=${otherBranch._id}`)
            .set('Authorization', `Bearer ${branchToken}`);

        // The controller defaults to their own branch if they try to access another without permission
        expect(response.status).toBe(200);
        // Should return 0 since testBranch has no transactions in this specific test cycle before this call
        expect(response.body.data.length).toBe(0);
    });
});

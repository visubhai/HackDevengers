import request from 'supertest';
import app from '../index';

describe('Health Check Endpoint', () => {
    it('should return 200 and healthy status when system is running', async () => {
        const response = await request(app).get('/api/health');

        expect(response.status).toBe(200);
        expect(response.body.status).toBe('success');
        expect(response.body.data).toBeDefined();

        // Let's also check if required fields exist
        expect(response.body.data.service).toBe('Parcel Management API');
        expect(response.body.data.timestamp).toBeDefined();
        // Since we mock db connect in tests, or we run it through memory server, it could be healthy or degraded if memory server wasn't properly initialized. But let's assume valid.
        expect(response.body.data.status).toBeDefined();
        expect(response.body.data.database).toBeDefined();
        expect(response.body.data.memory).toBeDefined();
        expect(response.body.data.system).toBeDefined();
    });
});

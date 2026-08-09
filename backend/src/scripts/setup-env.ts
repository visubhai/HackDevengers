// @ts-ignore
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_secret_key_123';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.test' });

import jwt from 'jsonwebtoken';
export const generateAuthToken = (user: any) => {
    return jwt.sign(
        { id: user._id, role: user.role, branchId: user.branchId },
        process.env.JWT_SECRET || 'test_secret_key_123',
        { expiresIn: '1h' }
    );
};

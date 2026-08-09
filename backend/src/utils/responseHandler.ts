import { Response } from 'express';

interface ApiResponse<T = any> {
    status: 'success' | 'fail' | 'error';
    message?: string;
    data?: T;
    meta?: {
        total?: number;
        page?: number;
        limit?: number;
        requestId?: string;
        [key: string]: any;
    };
}

export const sendResponse = <T>(
    res: Response,
    {
        statusCode = 200,
        status = 'success',
        message,
        data,
        meta
    }: {
        statusCode?: number;
        status?: 'success' | 'fail' | 'error';
        message?: string;
        data?: T;
        meta?: any;
    }
) => {
    const response: ApiResponse<T> = {
        status,
        message,
        data,
        meta: {
            ...meta,
            timestamp: new Date().toISOString()
        }
    };

    return res.status(statusCode).json(response);
};

export const successResponse = <T>(res: Response, data: T, message?: string, meta?: any) => {
    return sendResponse(res, {
        statusCode: 200,
        status: 'success',
        message,
        data,
        meta
    });
};

export const createdResponse = <T>(res: Response, data: T, message?: string) => {
    return sendResponse(res, {
        statusCode: 201,
        status: 'success',
        message,
        data
    });
};

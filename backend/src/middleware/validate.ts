import { Request, Response, NextFunction } from 'express';
import { z, ZodError } from 'zod';
import { sendResponse } from '../utils/responseHandler';

export const validate = (schema: z.ZodTypeAny) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            await schema.parseAsync({
                body: req.body,
                query: req.query,
                params: req.params,
                cookies: req.cookies,
            });
            return next();
        } catch (error: unknown) {
            if (error instanceof ZodError) {
                return sendResponse(res, {
                    statusCode: 400,
                    status: 'fail',
                    message: 'Validation failed',
                    data: error.issues.map((issue) => ({
                        path: issue.path.join('.'),
                        message: issue.message
                    }))
                });
            }
            return next(error);
        }
    };
};

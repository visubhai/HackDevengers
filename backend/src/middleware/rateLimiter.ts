import rateLimit from 'express-rate-limit';

export const authRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    validate: { xForwardedForHeader: false, default: false },
    keyGenerator: (req) => {
        return `${req.ip}_${req.body?.username || req.body?.email || 'unknown'}`;
    },
    message: {
        status: 429,
        message: 'Too many login attempts from this IP/User combination, please try again after 15 minutes'
    },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

export const passwordResetRateLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5, // Limit each IP to 5 requests per hour
    message: {
        status: 429,
        message: 'Too many password reset requests from this IP, please try again after an hour'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

export const apiRateLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 100, // Limit each IP to 100 requests per minute
    message: {
        status: 429,
        message: 'Too many requests from this IP, please try again later'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

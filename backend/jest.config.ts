import type { Config } from 'jest';

const config: Config = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    verbose: true,
    forceExit: true,
    clearMocks: true,
    resetMocks: true,
    restoreMocks: true,
    moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
    },
    testMatch: ['**/tests/**/*.test.ts'],
    setupFiles: ['<rootDir>/src/scripts/setup-env.ts'],
    setupFilesAfterEnv: ['<rootDir>/src/scripts/setup-test.ts'],
    collectCoverageFrom: [
        'src/**/*.ts',
        '!src/scripts/**',
        '!src/index.ts',
        '!**/node_modules/**',
    ],
    coverageThreshold: {
        global: {
            branches: 80,
            functions: 80,
            lines: 80,
            statements: 80,
        },
    },
};

export default config;

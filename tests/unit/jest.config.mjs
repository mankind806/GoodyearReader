// @ts-check

import {dirname} from 'node:path';
import {createRequire} from 'node:module';
const rootDir = dirname(createRequire(import.meta.url).resolve('../../package.json'));

/** @type {import('@jest/types').Config.InitialOptions} */
const config = {
    rootDir,
    testMatch: ['<rootDir>/tests/unit/**/*.tests.{ts,tsx}'],
    moduleFileExtensions: ['ts', 'tsx', 'js'],
    moduleNameMapper: {
        '@plus/(.*)': ['<rootDir>/src/stubs/$1'],
        '^malevic$': '<rootDir>/node_modules/malevic/umd/index.js',
        '^malevic/(.*)$': '<rootDir>/node_modules/malevic/umd/$1.js',
    },
    transform: {'^.+\\.ts(x?)$': ['ts-jest', {tsconfig: '<rootDir>/tests/unit/tsconfig.json'}]},
    globals: {
        __FIREFOX_MV2__: false,
        __CHROMIUM_MV2__: false,
        __CHROMIUM_MV3__: false,
        __THUNDERBIRD__: false,
        __DEBUG__: false,
        __PLUS__: false,
        __TEST__: true,
    },
    setupFilesAfterEnv: ['jest-extended/all'],
};

export default config;

/** @jest-environment jsdom */
import {bgFetch} from '../../../src/inject/dynamic-theme/network';

// Mock chrome API BEFORE importing anything
const chromeMock = {
    runtime: {
        sendMessage: jest.fn(),
        onMessage: {
            addListener: jest.fn(),
        },
    },
};
Object.assign(global, {chrome: chromeMock});

// We need to disable __TEST__ to enable CORS checks
(global as any).__TEST__ = false;

describe('bgFetch CORS checks', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        jest.resetModules();
    });

    it('JSDOM URL normalization check', () => {
        expect(new URL('https://127.1').hostname).toBe('127.0.0.1');
    });

    it('should allow valid domains', async () => {
        const {bgFetch} = require('../../../src/inject/dynamic-theme/network');
        const url = 'https://example.com/image.png';
        bgFetch({url: url, responseType: 'data-url', origin: 'https://attacker.com'});
        expect(chromeMock.runtime.sendMessage).toHaveBeenCalled();
    });

    it('should block HTTP protocol', async () => {
        const {bgFetch} = require('../../../src/inject/dynamic-theme/network');
        const url = 'http://example.com/image.png';
        await expect(async () => bgFetch({url, responseType: 'data-url', origin: 'https://attacker.com'}))
            .rejects.toThrow('Cross-origin limit reached');
    });

    it('should block dotless domains (intranet SSRF)', async () => {
        const {bgFetch} = require('../../../src/inject/dynamic-theme/network');
        const url = 'https://intranet/secret.png';
        await expect(async () => bgFetch({url, responseType: 'data-url', origin: 'https://attacker.com'}))
            .rejects.toThrow('Cross-origin limit reached');
        expect(chromeMock.runtime.sendMessage).not.toHaveBeenCalled();
    });

    it('should block standard IPv4 addresses', async () => {
        const {bgFetch} = require('../../../src/inject/dynamic-theme/network');
        const url = 'https://127.0.0.1/secret.png';
        await expect(async () => bgFetch({url, responseType: 'data-url', origin: 'https://attacker.com'}))
            .rejects.toThrow('Cross-origin limit reached');
        expect(chromeMock.runtime.sendMessage).not.toHaveBeenCalled();
    });

    it('should block loose IPv4 addresses (via regex or dotless check)', async () => {
        const {bgFetch} = require('../../../src/inject/dynamic-theme/network');

        // 127.1 is normalized to 127.0.0.1 by URL, so regex catches it.
        // But let's assume it wasn't.
        // 0x7f.1 (if not normalized) -> regex catches it.
        // 2130706433 -> dotless -> blocked.

        // We can test non-normalized values by mocking URL behavior? No, we rely on JSDOM.
        // But we can test regex against strings if we exported regex, but we didn't.
        // So we test via bgFetch with whatever URL supports.

        // 127.1 -> 127.0.0.1 -> blocked.
        await expect(async () => bgFetch({url: 'https://127.1', responseType: 'data-url', origin: 'https://attacker.com'}))
            .rejects.toThrow('Cross-origin limit reached');

        // Intranet -> dotless -> blocked.
        await expect(async () => bgFetch({url: 'https://intranet', responseType: 'data-url', origin: 'https://attacker.com'}))
            .rejects.toThrow('Cross-origin limit reached');
    });
});

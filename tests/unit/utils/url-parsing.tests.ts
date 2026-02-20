import {parseURL, parsedURLCache} from '../../../src/utils/url';

// Mock document for Node environment
if (typeof document === 'undefined') {
    (global as any).document = {
        createElement: (tagName: string) => {
            if (tagName === 'a') {
                return {
                    _href: '',
                    set href(val: string) {
                        this._href = val;
                    },
                    get href() {
                        try {
                            return new URL(this._href, 'http://localhost/').href;
                        } catch (e) {
                            return this._href;
                        }
                    },
                };
            }
            throw new Error(`Not implemented: ${tagName}`);
        },
    };
}

describe('URL parsing', () => {
    beforeEach(() => {
        parsedURLCache.clear();
    });

    test('should parse absolute URLs', () => {
        const url = parseURL('https://google.com/');
        expect(url.href).toBe('https://google.com/');
        expect(url.protocol).toBe('https:');
        expect(url.hostname).toBe('google.com');
        expect(url.pathname).toBe('/');
    });

    test('should parse relative URLs', () => {
        const url = parseURL('/path/to/resource');
        expect(url.href).toBe('http://localhost/path/to/resource');
        expect(url.pathname).toBe('/path/to/resource');
        expect(url.hostname).toBe('localhost');
    });

    test('should parse relative URLs (no slash)', () => {
        const url = parseURL('path/to/resource');
        expect(url.href).toBe('http://localhost/path/to/resource');
        expect(url.pathname).toBe('/path/to/resource');
    });

    test('should parse URLs with base', () => {
        const base = 'https://example.com/base/';
        const url = parseURL('page', base);
        expect(url.href).toBe('https://example.com/base/page');
        expect(url.hostname).toBe('example.com');
        expect(url.pathname).toBe('/base/page');
    });

    test('should parse URLs with base (relative base)', () => {
        const base = '/base/';
        const url = parseURL('page', base);
        expect(url.href).toBe('http://localhost/base/page');
        expect(url.pathname).toBe('/base/page');
    });

    test('should parse URLs with base (absolute URL ignores base)', () => {
        const base = 'https://example.com/base/';
        const url = parseURL('https://google.com/search', base);
        expect(url.href).toBe('https://google.com/search');
    });

    test('should cache parsed URLs', () => {
        const url1 = parseURL('https://google.com/');
        const url2 = parseURL('https://google.com/');
        expect(url1).toBe(url2); // Same object reference
    });

    test('should cache parsed URLs with base', () => {
        const url1 = parseURL('page', 'https://example.com/');
        const url2 = parseURL('page', 'https://example.com/');
        expect(url1).toBe(url2); // Same object reference
    });

    test('should handle protocol-relative URLs', () => {
        // In node environment with mock, base is http://localhost/
        // So //google.com should become http://google.com/
        const url = parseURL('//google.com');
        expect(url.href).toBe('http://google.com/');
        expect(url.protocol).toBe('http:');
    });
});

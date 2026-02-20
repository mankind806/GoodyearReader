import {isRelativeHrefOnAbsolutePath, parsedURLCache} from '../../../src/utils/url';

describe('isRelativeHrefOnAbsolutePath', () => {
    let originalLocation: Location;
    let originalDocument: Document;

    beforeAll(() => {
        // Mock document and location
        // Note: In Node environment, these might be undefined, but we should handle if they exist
        originalLocation = global.location;
        originalDocument = global.document;

        const createElement = jest.fn().mockImplementation((tagName: string) => {
             if (tagName === 'a') {
                return {
                    _href: '',
                    set href(val: string) {
                        this._href = new URL(val, global.location.href).href;
                    },
                    get href() {
                        return this._href;
                    }
                };
            }
            throw new Error(`Unexpected tag name: ${tagName}`);
        });

        Object.defineProperty(global, 'document', {
            value: {
                createElement,
            },
            writable: true
        });
    });

    afterAll(() => {
        global.location = originalLocation;
        global.document = originalDocument;
    });

    beforeEach(() => {
        parsedURLCache.clear();
    });

    function setLocation(url: string) {
        const u = new URL(url);
        Object.defineProperty(global, 'location', {
            value: {
                href: u.href,
                protocol: u.protocol,
                host: u.host,
                hostname: u.hostname,
                port: u.port,
                pathname: u.pathname,
                search: u.search,
                hash: u.hash,
                origin: u.origin
            },
            writable: true
        });
    }

    test('should return true when resource is in the same directory', () => {
        setLocation('https://duck.com/');
        expect(isRelativeHrefOnAbsolutePath('ext.css')).toBe(true);
        expect(isRelativeHrefOnAbsolutePath('https://duck.com/ext.css')).toBe(true);
    });

    test('should return false when resource is in a subdirectory', () => {
        setLocation('https://duck.com/');
        expect(isRelativeHrefOnAbsolutePath('styles/ext.css')).toBe(false);
        expect(isRelativeHrefOnAbsolutePath('https://duck.com/styles/ext.css')).toBe(false);
    });

    test('should return false when page is in subdirectory but resource is at root', () => {
        setLocation('https://duck.com/search/');
        expect(isRelativeHrefOnAbsolutePath('https://duck.com/ext.css')).toBe(false);
        expect(isRelativeHrefOnAbsolutePath('../ext.css')).toBe(false);
    });

    test('should return true when page and resource are in same subdirectory', () => {
        setLocation('https://duck.com/search/');
        expect(isRelativeHrefOnAbsolutePath('ext.css')).toBe(true);
        expect(isRelativeHrefOnAbsolutePath('https://duck.com/search/ext.css')).toBe(true);
    });
});

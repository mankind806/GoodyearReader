describe('getFontList', () => {
    let originalChrome: typeof chrome;

    beforeEach(() => {
        originalChrome = global.chrome;
        global.chrome = {} as any;
        jest.resetModules();
    });

    afterEach(() => {
        global.chrome = originalChrome;
    });

    test('should return fallback fonts when chrome.fontSettings is missing and isFirefox is true', async () => {
        jest.doMock('../../../src/utils/platform', () => ({
            isMobile: false,
            isFirefox: true,
        }));
        const {getFontList} = await import('../../../src/ui/utils');
        const fonts = await getFontList();
        expect(fonts).toEqual([
            'serif',
            'sans-serif',
            'monospace',
            'cursive',
            'fantasy',
            'system-ui',
        ]);
    });

    test('should return empty list when chrome.fontSettings is missing and isFirefox is false', async () => {
        jest.doMock('../../../src/utils/platform', () => ({
            isMobile: false,
            isFirefox: false,
        }));
        const {getFontList} = await import('../../../src/ui/utils');
        const fonts = await getFontList();
        expect(fonts).toEqual([]);
    });

    test('should return fonts from API when chrome.fontSettings is present', async () => {
        jest.doMock('../../../src/utils/platform', () => ({
            isMobile: false,
            isFirefox: false,
        }));

        const mockFonts = [{fontId: 'Arial'}, {fontId: 'Times New Roman'}];
        global.chrome.fontSettings = {
            getFontList: jest.fn((callback: (fonts: any[]) => void) => callback(mockFonts)),
        } as any;

        const {getFontList} = await import('../../../src/ui/utils');
        const fonts = await getFontList();
        expect(fonts).toEqual(['Arial', 'Times New Roman']);
    });
});

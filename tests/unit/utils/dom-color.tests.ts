
describe('domParseColor', () => {
    let parse: typeof import('../../../src/utils/color').parse;
    let originalOffscreenCanvas: any;
    let originalDocument: any;
    let createdCanvases: any[];
    let createdOffscreenCanvases: any[];

    beforeEach(async () => {
        jest.resetModules();
        originalOffscreenCanvas = global.OffscreenCanvas;
        originalDocument = (global as any).document;
        createdCanvases = [];
        createdOffscreenCanvases = [];

        // Mock document.createElement('canvas')
        const mockDocument = {
            createElement: jest.fn((tagName: string) => {
                if (tagName === 'canvas') {
                    const canvas = {
                        width: 0,
                        height: 0,
                        getContext: jest.fn().mockReturnValue({
                            fillStyle: '',
                            fillRect: jest.fn(),
                            getImageData: jest.fn().mockReturnValue({
                                data: [255, 0, 0, 255] // Red
                            }),
                        }),
                    };
                    createdCanvases.push(canvas);
                    return canvas as any;
                }
                return {};
            }),
        };
        (global as any).document = mockDocument;

        // Mock OffscreenCanvas
        global.OffscreenCanvas = class MockOffscreenCanvas {
            width: number;
            height: number;
            constructor(width: number, height: number) {
                this.width = width;
                this.height = height;
                createdOffscreenCanvases.push(this);
            }
            getContext() {
                return {
                    fillStyle: '',
                    fillRect: jest.fn(),
                    getImageData: jest.fn().mockReturnValue({
                        data: [0, 255, 0, 255] // Green
                    }),
                };
            }
        } as any;

        const colorModule = await import('../../../src/utils/color');
        parse = colorModule.parse;
    });

    afterEach(() => {
        global.OffscreenCanvas = originalOffscreenCanvas;
        (global as any).document = originalDocument;
        jest.restoreAllMocks();
    });

    test('should use OffscreenCanvas if available', () => {
        // color-mix triggers domParseColor
        const result = parse('color-mix(in srgb, red, blue)');
        expect(createdOffscreenCanvases.length).toBe(1);
        expect(createdCanvases.length).toBe(0);
        expect(result).toEqual({r: 0, g: 255, b: 0, a: 1}); // Expect Green from MockOffscreenCanvas
    });

    test('should use document.createElement if OffscreenCanvas is not available', async () => {
        // Reset modules and remove OffscreenCanvas
        jest.resetModules();
        delete (global as any).OffscreenCanvas;
        (global as any).document = {
            createElement: jest.fn((tagName: string) => {
                if (tagName === 'canvas') {
                    const canvas = {
                        width: 0,
                        height: 0,
                        getContext: jest.fn().mockReturnValue({
                            fillStyle: '',
                            fillRect: jest.fn(),
                            getImageData: jest.fn().mockReturnValue({
                                data: [255, 0, 0, 255] // Red
                            }),
                        }),
                    };
                    createdCanvases.push(canvas);
                    return canvas as any;
                }
                return {};
            }),
        };

        // Re-import to simulate environment without OffscreenCanvas
        const colorModule = await import('../../../src/utils/color');
        parse = colorModule.parse;

        const result = parse('color(display-p3 1 0 0)');
        expect(createdOffscreenCanvases.length).toBe(0);
        expect(createdCanvases.length).toBe(1);
        expect(result).toEqual({r: 255, g: 0, b: 0, a: 1}); // Expect Red from MockCanvas
    });
});

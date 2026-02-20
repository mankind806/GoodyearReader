
// Mock global document before imports
const mockContext = {
    fillStyle: '',
    fillRect: jest.fn(),
    getImageData: jest.fn().mockReturnValue({
        data: [255, 0, 0, 255] // Red by default
    }),
};

const mockCanvas = {
    width: 0,
    height: 0,
    getContext: jest.fn().mockReturnValue(mockContext),
};

const mockCreateElement = jest.fn((tagName: string) => {
    if (tagName === 'canvas') {
        return mockCanvas;
    }
    return {};
});

(global as any).document = {
    createElement: mockCreateElement,
};

// We need to delay import of color module until after document is mocked?
// Actually, color.ts imports are top-level but code inside domParseColor is runtime.
// BUT, color.ts might reference document at top level? No, checked file, it doesn't.
// Except `isDefinedSelectorSupported` in platform.ts might? No, that's platform.ts.

import {parse} from '../../../src/utils/color';

describe('domParseColor', () => {
    let originalOffscreenCanvas: any;
    let createdOffscreenCanvases: any[];
    let parseModule: typeof import('../../../src/utils/color');

    beforeEach(async () => {
        originalOffscreenCanvas = global.OffscreenCanvas;
        createdOffscreenCanvases = [];

        // Reset mocks
        mockCreateElement.mockClear();
        mockCanvas.getContext.mockClear();
        mockContext.getImageData.mockClear();
        // Reset default mock return
        mockContext.getImageData.mockReturnValue({
            data: [255, 0, 0, 255]
        });

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

        jest.resetModules();
        // re-mock document because resetModules might clear globals? No, it shouldn't clear globals.
        // But we need to re-import the module to get a fresh instance of `let canvas`.
        parseModule = await import('../../../src/utils/color');
    });

    afterEach(() => {
        jest.restoreAllMocks();
        global.OffscreenCanvas = originalOffscreenCanvas;
    });

    test('should use OffscreenCanvas if available', () => {
        // color-mix triggers domParseColor
        const result = parseModule.parse('color-mix(in srgb, red, blue)');
        expect(createdOffscreenCanvases.length).toBe(1);
        expect(mockCreateElement).not.toHaveBeenCalledWith('canvas');
        // Expect Green from MockOffscreenCanvas
        expect(result).toEqual({r: 0, g: 255, b: 0, a: 1});
    });

    test('should use document.createElement if OffscreenCanvas is not available', async () => {
        delete (global as any).OffscreenCanvas;
        jest.resetModules();
        parseModule = await import('../../../src/utils/color');

        const result = parseModule.parse('color(display-p3 1 0 0)');
        expect(createdOffscreenCanvases.length).toBe(0);
        expect(mockCreateElement).toHaveBeenCalledWith('canvas');
        // Expect Red from MockCanvas
        expect(result).toEqual({r: 255, g: 0, b: 0, a: 1});
    });

    test('should cache the context (reuse canvas)', () => {
        const result1 = parseModule.parse('color-mix(in srgb, red, blue)');
        const result2 = parseModule.parse('color-mix(in srgb, blue, red)'); // Different color string

        expect(createdOffscreenCanvases.length).toBe(1);
        expect(result1).toEqual({r: 0, g: 255, b: 0, a: 1});
        expect(result2).toEqual({r: 0, g: 255, b: 0, a: 1});
    });
});

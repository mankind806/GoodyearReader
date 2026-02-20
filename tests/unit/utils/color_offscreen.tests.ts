import {jest} from '@jest/globals';

describe('OffscreenCanvas optimization', () => {
    let parse: typeof import('../../../src/utils/color').parse;
    let OffscreenCanvasMock: any;
    let contextMock: any;

    beforeEach(async () => {
        jest.resetModules();

        contextMock = {
            fillStyle: '',
            fillRect: jest.fn(),
            getImageData: jest.fn(() => ({
                data: [255, 0, 0, 255]
            })),
        };

        OffscreenCanvasMock = jest.fn((width: number, height: number) => {
            return {
                width,
                height,
                getContext: jest.fn(() => contextMock),
            };
        });

        // Mock OffscreenCanvas global
        // @ts-ignore
        global.OffscreenCanvas = OffscreenCanvasMock;
        // @ts-ignore
        global.OffscreenCanvasRenderingContext2D = class {};

        const colorModule = await import('../../../src/utils/color');
        parse = colorModule.parse;
    });

    afterEach(() => {
        // @ts-ignore
        delete global.OffscreenCanvas;
        // @ts-ignore
        delete global.OffscreenCanvasRenderingContext2D;
    });

    test('should use OffscreenCanvas when available', () => {
        const result = parse('color(display-p3 1 0 0)');

        expect(OffscreenCanvasMock).toHaveBeenCalledTimes(1);
        expect(OffscreenCanvasMock).toHaveBeenCalledWith(1, 1);
        expect(contextMock.fillRect).toHaveBeenCalledWith(0, 0, 1, 1);
        expect(result).toEqual({r: 255, g: 0, b: 0, a: 1});
    });

    test('should fallback to document.createElement when OffscreenCanvas is not available', async () => {
        jest.resetModules();
        // @ts-ignore
        delete global.OffscreenCanvas;

        const contextMock = {
            fillStyle: '',
            fillRect: jest.fn(),
            getImageData: jest.fn(() => ({
                data: [0, 255, 0, 255]
            })),
        };

        const createElementMock = jest.fn(() => ({
            width: 0,
            height: 0,
            getContext: jest.fn(() => contextMock),
        }));

        let restoreDocument = false;
        if (typeof document === 'undefined') {
            // @ts-ignore
            global.document = {
                createElement: createElementMock as any
            };
            restoreDocument = true;
        } else {
            jest.spyOn(document, 'createElement').mockImplementation(createElementMock as any);
        }

        const colorModule = await import('../../../src/utils/color');
        const parse = colorModule.parse;

        const result = parse('color(display-p3 0 1 0)');

        expect(createElementMock).toHaveBeenCalledWith('canvas');
        expect(contextMock.fillRect).toHaveBeenCalledWith(0, 0, 1, 1);
        expect(result).toEqual({r: 0, g: 255, b: 0, a: 1});

        if (restoreDocument) {
            // @ts-ignore
            delete global.document;
        } else {
            jest.restoreAllMocks();
        }
    });
});

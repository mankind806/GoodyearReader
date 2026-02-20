import {throttle} from '../../../src/utils/throttle';

describe('Throttle', () => {
    let frameId = 0;
    let pendingCallbacks: {[key: number]: () => void} = {};

    beforeEach(() => {
        frameId = 0;
        pendingCallbacks = {};
        (global as any).requestAnimationFrame = (callback: () => void) => {
            frameId++;
            pendingCallbacks[frameId] = callback;
            return frameId;
        };
        (global as any).cancelAnimationFrame = (id: number) => {
            delete pendingCallbacks[id];
        };
    });

    afterEach(() => {
        delete (global as any).requestAnimationFrame;
        delete (global as any).cancelAnimationFrame;
    });

    function nextFrame() {
        const ids = Object.keys(pendingCallbacks).map(Number);
        for (const id of ids) {
            if (pendingCallbacks[id]) {
                const callback = pendingCallbacks[id];
                delete pendingCallbacks[id];
                callback();
            }
        }
    }

    test('should execute callback immediately', () => {
        const callback = jest.fn();
        const throttled = throttle(callback);
        throttled();
        expect(callback).toHaveBeenCalledTimes(1);
    });

    test('should throttle subsequent calls', () => {
        const callback = jest.fn();
        const throttled = throttle(callback);
        throttled();
        throttled();
        throttled();
        expect(callback).toHaveBeenCalledTimes(1);
        nextFrame();
        expect(callback).toHaveBeenCalledTimes(2);
    });

    test('should use latest arguments', () => {
        const callback = jest.fn();
        const throttled = throttle(callback);
        throttled(1);
        throttled(2);
        throttled(3);
        expect(callback).toHaveBeenCalledWith(1);
        nextFrame();
        expect(callback).toHaveBeenCalledWith(3);
    });

    test('should cancel pending execution', () => {
        const callback = jest.fn();
        const throttled = throttle(callback);
        throttled();
        throttled();
        throttled.cancel();
        nextFrame();
        expect(callback).toHaveBeenCalledTimes(1);
    });
});

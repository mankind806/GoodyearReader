import {throttle, createAsyncTasksQueue} from '../../../src/utils/throttle';

// Polyfill/Mock for non-browser environment
if (typeof global.requestAnimationFrame === 'undefined') {
    (global as any).requestAnimationFrame = (cb: any) => setTimeout(cb, 0);
    (global as any).cancelAnimationFrame = (id: any) => clearTimeout(id);
}

// Mock document
if (typeof global.document === 'undefined') {
    (global as any).document = {
        dispatchEvent: () => {},
    };
}

// Mock CustomEvent
if (typeof global.CustomEvent === 'undefined') {
    (global as any).CustomEvent = class CustomEvent {
        constructor(type: string, eventInitDict?: any) {}
    };
}

describe('throttle', () => {
    let requestAnimationFrameSpy: any;
    let cancelAnimationFrameSpy: any;
    let rafCallbacks: {[key: number]: (time: number) => void} = {};
    let nextFrameId = 1;

    beforeEach(() => {
        rafCallbacks = {};
        nextFrameId = 1;
        // Mock requestAnimationFrame
        requestAnimationFrameSpy = jest.spyOn(global as any, 'requestAnimationFrame').mockImplementation((cb: any) => {
            const id = nextFrameId++;
            rafCallbacks[id] = cb;
            return id;
        });
        // Mock cancelAnimationFrame
        cancelAnimationFrameSpy = jest.spyOn(global as any, 'cancelAnimationFrame').mockImplementation((id: any) => {
            delete rafCallbacks[id];
        });
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    function triggerFrame() {
        const callbacks = Object.values(rafCallbacks);
        rafCallbacks = {};
        callbacks.forEach((cb) => cb(performance.now()));
    }

    test('should throttle calls', () => {
        const callback = jest.fn();
        const throttled = throttle(callback);

        throttled('a');
        expect(callback).toHaveBeenCalledWith('a');
        expect(callback).toHaveBeenCalledTimes(1);

        throttled('b');
        expect(callback).toHaveBeenCalledTimes(1); // Should be throttled

        throttled('c');
        expect(callback).toHaveBeenCalledTimes(1); // Still throttled

        triggerFrame();
        expect(callback).toHaveBeenCalledWith('c');
        expect(callback).toHaveBeenCalledTimes(2);
    });

    test('should cancel pending call', () => {
        const callback = jest.fn();
        const throttled = throttle(callback);

        throttled('a');
        expect(callback).toHaveBeenCalledWith('a');

        throttled('b');
        throttled.cancel();

        triggerFrame();
        expect(callback).toHaveBeenCalledTimes(1); // 'b' should not be called
    });

    test('cancel should be safe to call multiple times', () => {
        const callback = jest.fn();
        const throttled = throttle(callback);
        throttled.cancel();
        throttled.cancel();
        expect(callback).not.toHaveBeenCalled();
    });
});

describe('createAsyncTasksQueue', () => {
    let requestAnimationFrameSpy: any;
    let cancelAnimationFrameSpy: any;
    let rafCallbacks: {[key: number]: (time: number) => void} = {};
    let nextFrameId = 1;

    beforeEach(() => {
        rafCallbacks = {};
        nextFrameId = 1;
        requestAnimationFrameSpy = jest.spyOn(global as any, 'requestAnimationFrame').mockImplementation((cb: any) => {
            const id = nextFrameId++;
            rafCallbacks[id] = cb;
            return id;
        });
        cancelAnimationFrameSpy = jest.spyOn(global as any, 'cancelAnimationFrame').mockImplementation((id: any) => {
            delete rafCallbacks[id];
        });
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    function triggerFrame() {
        const callbacks = Object.values(rafCallbacks);
        rafCallbacks = {};
        callbacks.forEach((cb) => cb(performance.now()));
    }

    test('should execute tasks async', () => {
        const queue = createAsyncTasksQueue();
        const task1 = jest.fn();
        const task2 = jest.fn();

        queue.add(task1);
        queue.add(task2);

        expect(task1).not.toHaveBeenCalled();
        expect(task2).not.toHaveBeenCalled();

        triggerFrame();

        expect(task1).toHaveBeenCalled();
        expect(task2).toHaveBeenCalled();
    });

    test('should cancel tasks', () => {
        const queue = createAsyncTasksQueue();
        const task1 = jest.fn();

        queue.add(task1);
        queue.cancel();

        triggerFrame();

        expect(task1).not.toHaveBeenCalled();
    });
});

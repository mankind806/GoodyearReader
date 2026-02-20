import {throttle, createAsyncTasksQueue} from '../../../src/utils/throttle';

describe('throttle utils', () => {
    let originalRAF: any;
    let originalCAF: any;
    let frameCallbacks: Map<number, (time: number) => void>;
    let frameIdCounter: number;

    beforeEach(() => {
        originalRAF = (global as any).requestAnimationFrame;
        originalCAF = (global as any).cancelAnimationFrame;
        frameCallbacks = new Map();
        frameIdCounter = 0;

        (global as any).requestAnimationFrame = (callback: (time: number) => void) => {
            const id = ++frameIdCounter;
            frameCallbacks.set(id, callback);
            return id;
        };

        (global as any).cancelAnimationFrame = (id: number) => {
            frameCallbacks.delete(id);
        };

        if (!(global as any).document) {
            (global as any).document = {
                dispatchEvent: jest.fn(),
            };
        }
    });

    afterEach(() => {
        (global as any).requestAnimationFrame = originalRAF;
        (global as any).cancelAnimationFrame = originalCAF;
    });

    function runFrames() {
        const callbacks = Array.from(frameCallbacks.values());
        frameCallbacks.clear();
        callbacks.forEach((cb) => cb(Date.now()));
    }

    describe('throttle', () => {
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
            expect(callback).toHaveBeenCalledTimes(1);

            throttled();
            expect(callback).toHaveBeenCalledTimes(1);

            runFrames();
            expect(callback).toHaveBeenCalledTimes(2);
        });

        test('should execute with latest arguments', () => {
            const callback = jest.fn();
            const throttled = throttle(callback);
            throttled(1);
            throttled(2);
            throttled(3);
            expect(callback).toHaveBeenCalledWith(1);

            runFrames();
            expect(callback).toHaveBeenCalledWith(3);
            expect(callback).toHaveBeenCalledTimes(2);
        });

        test('should cancel pending execution', () => {
            const callback = jest.fn();
            const throttled = throttle(callback);
            throttled();
            throttled();
            throttled.cancel();

            runFrames();
            expect(callback).toHaveBeenCalledTimes(1);
        });
    });

    describe('createAsyncTasksQueue', () => {
        test('should execute tasks', () => {
            const queue = createAsyncTasksQueue();
            const task1 = jest.fn();
            const task2 = jest.fn();

            queue.add(task1);
            queue.add(task2);

            expect(task1).not.toHaveBeenCalled();
            expect(task2).not.toHaveBeenCalled();

            runFrames();

            expect(task1).toHaveBeenCalled();
            expect(task2).toHaveBeenCalled();
        });

        test('should cancel execution', () => {
            const queue = createAsyncTasksQueue();
            const task1 = jest.fn();

            queue.add(task1);
            queue.cancel();

            runFrames();

            expect(task1).not.toHaveBeenCalled();
        });
    });
});

/**
 * @jest-environment jsdom
 */
import {throttle, createAsyncTasksQueue} from '../../../src/utils/throttle';

describe('Throttle', () => {
    let frameId = 0;
    const callbacks = new Map<number, FrameRequestCallback>();

    beforeAll(() => {
        jest.useFakeTimers();
        jest.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
            frameId++;
            callbacks.set(frameId, cb);
            return frameId;
        });
        jest.spyOn(window, 'cancelAnimationFrame').mockImplementation((id) => {
            callbacks.delete(id);
        });
    });

    afterAll(() => {
        jest.useRealTimers();
        jest.restoreAllMocks();
    });

    beforeEach(() => {
        frameId = 0;
        callbacks.clear();
    });

    function tick() {
        const currentCallbacks = Array.from(callbacks.values());
        callbacks.clear();
        currentCallbacks.forEach((cb) => cb(Date.now()));
    }

    test('Throttling', () => {
        const callback = jest.fn();
        const throttled = throttle(callback);

        throttled();
        expect(callback).toHaveBeenCalledTimes(1);
        expect(callbacks.size).toBe(1);

        throttled();
        expect(callback).toHaveBeenCalledTimes(1);
        expect(callbacks.size).toBe(1);

        tick();
        expect(callback).toHaveBeenCalledTimes(2);
        expect(callbacks.size).toBe(0);
    });

    test('Throttling cancellation', () => {
        const callback = jest.fn();
        const throttled = throttle(callback);

        throttled();
        expect(callback).toHaveBeenCalledTimes(1);
        expect(callbacks.size).toBe(1);

        throttled();
        expect(callback).toHaveBeenCalledTimes(1);
        expect(callbacks.size).toBe(1);

        throttled.cancel();
        expect(callbacks.size).toBe(0);

        tick();
        expect(callback).toHaveBeenCalledTimes(1);
    });

    test('AsyncTasksQueue', () => {
        const queue = createAsyncTasksQueue();
        const task1 = jest.fn();
        const task2 = jest.fn();

        queue.add(task1);
        expect(callbacks.size).toBe(1);
        expect(task1).not.toHaveBeenCalled();

        queue.add(task2);
        expect(callbacks.size).toBe(1);
        expect(task2).not.toHaveBeenCalled();

        tick();
        expect(task1).toHaveBeenCalled();
        expect(task2).toHaveBeenCalled();
        expect(callbacks.size).toBe(0);
    });

    test('AsyncTasksQueue cancellation', () => {
        const queue = createAsyncTasksQueue();
        const task1 = jest.fn();
        const task2 = jest.fn();

        queue.add(task1);
        queue.add(task2);
        expect(callbacks.size).toBe(1);

        queue.cancel();
        expect(callbacks.size).toBe(0);

        tick();
        expect(task1).not.toHaveBeenCalled();
        expect(task2).not.toHaveBeenCalled();
    });
});

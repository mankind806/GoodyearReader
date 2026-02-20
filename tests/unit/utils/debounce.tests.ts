import {debounce} from '../../../src/utils/debounce';

describe('Debounce', () => {
    beforeEach(() => {
        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.clearAllTimers();
        jest.useRealTimers();
    });

    test('should execute function after delay', () => {
        const fn = jest.fn();
        const debounced = debounce(100, fn);

        debounced();
        expect(fn).not.toHaveBeenCalled();

        jest.advanceTimersByTime(50);
        expect(fn).not.toHaveBeenCalled();

        jest.advanceTimersByTime(50);
        expect(fn).toHaveBeenCalledTimes(1);
    });

    test('should reset timer on subsequent calls', () => {
        const fn = jest.fn();
        const debounced = debounce(100, fn);

        debounced();
        jest.advanceTimersByTime(50);
        debounced();
        jest.advanceTimersByTime(50);
        expect(fn).not.toHaveBeenCalled();

        jest.advanceTimersByTime(50);
        expect(fn).toHaveBeenCalledTimes(1);
    });

    test('should pass arguments to the debounced function', () => {
        const fn = jest.fn();
        const debounced = debounce(100, fn);

        debounced('arg1', 'arg2');
        jest.advanceTimersByTime(100);
        expect(fn).toHaveBeenCalledWith('arg1', 'arg2');
    });

    test('should handle multiple calls correctly', () => {
        const fn = jest.fn();
        const debounced = debounce(100, fn);

        debounced();
        jest.advanceTimersByTime(100);
        expect(fn).toHaveBeenCalledTimes(1);

        debounced();
        jest.advanceTimersByTime(100);
        expect(fn).toHaveBeenCalledTimes(2);
    });
});

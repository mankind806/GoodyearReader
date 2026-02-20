import {cachedFactory} from '../../../src/utils/cache';

test('cachedFactory: Basic functionality', () => {
    const factory = (key: string) => key.toUpperCase();
    const cached = cachedFactory(factory, 10);

    expect(cached('a')).toBe('A');
    expect(cached('b')).toBe('B');
});

test('cachedFactory: Caching behavior', () => {
    let callCount = 0;
    const factory = (key: string) => {
        callCount++;
        return key.toUpperCase();
    };
    const cached = cachedFactory(factory, 10);

    expect(cached('a')).toBe('A');
    expect(callCount).toBe(1);

    expect(cached('a')).toBe('A');
    expect(callCount).toBe(1);

    expect(cached('b')).toBe('B');
    expect(callCount).toBe(2);

    expect(cached('b')).toBe('B');
    expect(callCount).toBe(2);
});

test('cachedFactory: Size limit eviction', () => {
    let callCount = 0;
    const factory = (key: string) => {
        callCount++;
        return key.toUpperCase();
    };
    const cached = cachedFactory(factory, 2);

    expect(cached('a')).toBe('A');
    expect(cached('b')).toBe('B');
    expect(callCount).toBe(2);

    // This should evict 'a' because it was the first one added
    expect(cached('c')).toBe('C');
    expect(callCount).toBe(3);

    // 'a' should be called again because it was evicted
    expect(cached('a')).toBe('A');
    expect(callCount).toBe(4);

    // Cache should now be {'c', 'a'} because 'b' was evicted when 'a' was re-added
    expect(cached('b')).toBe('B');
    expect(callCount).toBe(5);
});

test('cachedFactory: FIFO behavior (not LRU)', () => {
    let callCount = 0;
    const factory = (key: string) => {
        callCount++;
        return key.toUpperCase();
    };
    const cached = cachedFactory(factory, 2);

    cached('a'); // Cache: {a}
    cached('b'); // Cache: {a, b}
    expect(callCount).toBe(2);

    // Access 'a' again. In LRU this would move 'a' to the end.
    // But in this FIFO implementation, it stays at the front.
    cached('a');
    expect(callCount).toBe(2);

    // This should evict 'a' because it's still at the front.
    cached('c'); // Cache becomes {b, c}
    expect(callCount).toBe(3);

    // 'a' should be a miss
    cached('a');
    expect(callCount).toBe(4);
});

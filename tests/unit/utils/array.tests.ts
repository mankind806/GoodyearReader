import {forEach} from '../../../src/utils/array';

test('forEach array', () => {
    let count = 0;
    const array = [1, 2, 3];
    forEach(array, (item) => {
        count++;
        expect(item).toBe(count);
    });
    expect(count).toBe(3);
});

test('forEach ArrayLike', () => {
    let count = 0;
    const arrayLike = {0: 'a', 1: 'b', length: 2};
    const results: string[] = [];
    forEach(arrayLike, (item) => {
        results.push(item);
        count++;
    });
    expect(count).toBe(2);
    expect(results).toEqual(['a', 'b']);
});

test('forEach Set', () => {
    const set = new Set([1, 2, 3]);
    let sum = 0;
    forEach(set, (item) => {
        sum += item;
    });
    expect(sum).toBe(6);
});

test('forEach Map', () => {
    const map = new Map([['a', 1], ['b', 2]]);
    const keys: string[] = [];
    const values: number[] = [];
    forEach(map, ([key, value]) => {
        keys.push(key);
        values.push(value);
    });
    expect(keys).toEqual(['a', 'b']);
    expect(values).toEqual([1, 2]);
});

test('forEach String', () => {
    const str = 'abc';
    const chars: string[] = [];
    forEach(str, (char) => {
        chars.push(char);
    });
    expect(chars).toEqual(['a', 'b', 'c']);
});

test('forEach Empty', () => {
    let count = 0;
    forEach([], () => count++);
    expect(count).toBe(0);

    forEach(new Set(), () => count++);
    expect(count).toBe(0);

    forEach(new Map(), () => count++);
    expect(count).toBe(0);

    forEach('', () => count++);
    expect(count).toBe(0);
});

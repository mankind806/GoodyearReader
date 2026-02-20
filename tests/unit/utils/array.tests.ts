import {forEach, push, toArray} from '../../../src/utils/array';

test('forEach array', () => {
    let count = 0;
    const array = [1, 2, 3];
    forEach(array, (item) => {
        count += item;
    });
    expect(count).toEqual(6);
});

test('forEach ArrayLike', () => {
    let count = 0;
    const arrayLike = {0: 1, 1: 2, 2: 3, length: 3};
    forEach(arrayLike, (item) => {
        count += item;
    });
    expect(count).toEqual(6);
});

test('forEach Set', () => {
    let count = 0;
    const set = new Set([1, 2, 3]);
    forEach(set, (item) => {
        count += item;
    });
    expect(count).toEqual(6);
});

test('forEach Map', () => {
    let count = 0;
    const map = new Map([['a', 1], ['b', 2], ['c', 3]]);
    forEach(map, ([key, value]) => {
        count += value;
    });
    expect(count).toEqual(6);
});

test('forEach String', () => {
    let result = '';
    const str = 'abc';
    forEach(str, (char) => {
        result += char;
    });
    expect(result).toEqual('abc');
});

test('forEach empty', () => {
    let count = 0;
    forEach([], () => count++);
    expect(count).toEqual(0);

    forEach(new Set(), () => count++);
    expect(count).toEqual(0);

    forEach({length: 0}, () => count++);
    expect(count).toEqual(0);

    forEach('', () => count++);
    expect(count).toEqual(0);
});

test('push Array', () => {
    const array = [1, 2, 3];
    push(array, [4, 5]);
    expect(array).toEqual([1, 2, 3, 4, 5]);
});

test('push Set', () => {
    const array = [1, 2, 3];
    push(array, new Set([4, 5]));
    expect(array).toEqual([1, 2, 3, 4, 5]);
});

test('push ArrayLike', () => {
    const array = [1, 2, 3];
    const arrayLike = {0: 4, 1: 5, length: 2};
    push(array, arrayLike);
    expect(array).toEqual([1, 2, 3, 4, 5]);
});

test('toArray ArrayLike', () => {
    const arrayLike = {0: 1, 1: 2, 2: 3, length: 3};
    const result = toArray(arrayLike);
    expect(result).toEqual([1, 2, 3]);
    expect(result).not.toBe(arrayLike);
    expect(Array.isArray(result)).toBe(true);
});

test('toArray String', () => {
    const str = 'abc';
    const result = toArray(str);
    expect(result).toEqual(['a', 'b', 'c']);
});

test('toArray empty', () => {
    const result = toArray({length: 0});
    expect(result).toEqual([]);
});

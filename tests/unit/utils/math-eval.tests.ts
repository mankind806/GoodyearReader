import {evalMath} from '../../../src/utils/math-eval';

test('Basic Arithmetic', () => {
    expect(evalMath('1 + 2')).toEqual(3);
    expect(evalMath('2 * 3')).toEqual(6);
    expect(evalMath('10 - 4')).toEqual(6);
    expect(evalMath('8 / 2')).toEqual(4);
});

test('Precedence', () => {
    expect(evalMath('1 + 2 * 3')).toEqual(7);
    expect(evalMath('2 * 3 + 1')).toEqual(7);
    expect(evalMath('10 - 2 * 3')).toEqual(4);
    expect(evalMath('10 / 2 + 3')).toEqual(8);
});

test('Floats', () => {
    expect(evalMath('1.5 + 2.5')).toEqual(4);
    expect(evalMath('10.5 - 0.5')).toEqual(10);
});

test('Whitespace', () => {
    expect(evalMath('1   +   2')).toEqual(3);
    // Note: Spaces between digits are ignored and digits are concatenated
    expect(evalMath('1 2 + 3')).toEqual(15);
});

test('Complex Expressions', () => {
    expect(evalMath('1 + 2 * 3 - 4 / 2')).toEqual(5);
});

test('Division by Zero', () => {
    expect(evalMath('1 / 0')).toEqual(Infinity);
});

test('Invalid Expressions', () => {
    expect(evalMath('+ 1')).toBeNaN();
    expect(evalMath('1 +')).toBeNaN();
    // '1 2' is parsed as '12' due to space skipping logic in number parsing
    expect(evalMath('1 2')).toEqual(12);
});

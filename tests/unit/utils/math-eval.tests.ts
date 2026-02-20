import {evalMath} from '../../../src/utils/math-eval';

describe('evalMath', () => {
    it('should evaluate basic arithmetic', () => {
        expect(evalMath('1 + 2')).toEqual(3);
        expect(evalMath('10 - 4')).toEqual(6);
        expect(evalMath('2 * 3')).toEqual(6);
        expect(evalMath('8 / 2')).toEqual(4);
    });

    it('should handle operator precedence', () => {
        expect(evalMath('1 + 2 * 3')).toEqual(7);
        expect(evalMath('2 * 3 + 1')).toEqual(7);
        expect(evalMath('10 - 2 * 3')).toEqual(4);
        expect(evalMath('10 / 2 + 3')).toEqual(8);
        expect(evalMath('10 / 2 * 3')).toEqual(15);
    });

    it('should handle float numbers', () => {
        expect(evalMath('1.5 + 2.5')).toEqual(4);
        expect(evalMath('10.5 - 0.5')).toEqual(10);
        expect(evalMath('0.1 + 0.2')).toBeCloseTo(0.3);
    });

    it('should handle complex expressions', () => {
        expect(evalMath('1 + 2 * 3 - 4 / 2')).toEqual(5);
    });

    it('should handle whitespace', () => {
        expect(evalMath('1   +   2')).toEqual(3);
        // Documenting existing behavior: spaces between digits concatenate them
        expect(evalMath('1 2 + 3')).toEqual(15);
    });
});

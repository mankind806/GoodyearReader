import 'malevic';
import {classes} from '../../../src/ui/utils';

describe('UI utils', () => {
    describe('classes', () => {
        test('should return empty string for no arguments', () => {
            expect(classes()).toBe('');
        });

        test('should return single class', () => {
            expect(classes('a')).toBe('a');
        });

        test('should join multiple classes', () => {
            expect(classes('a', 'b')).toBe('a b');
        });

        test('should filter falsy values (empty strings)', () => {
            expect(classes('a', '', 'b')).toBe('a b');
        });

        test('should handle object arguments', () => {
            expect(classes({
                'a': true,
                'b': false,
                'c': true,
            })).toBe('a c');
        });

        test('should handle mixed string and object arguments', () => {
            expect(classes('a', {'b': true, 'c': false}, 'd')).toBe('a b d');
        });

        test('should handle multiple object arguments', () => {
            expect(classes({'a': true}, {'b': true})).toBe('a b');
        });

        test('should handle undefined or null if passed', () => {
            // @ts-ignore
            expect(classes('a', null, undefined, 'b')).toBe('a b');
        });
    });
});

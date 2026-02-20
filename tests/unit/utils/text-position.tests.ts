import {getTextPositionMessage} from '../../../src/utils/text';

describe('getTextPositionMessage', () => {
    test('Single line text', () => {
        const text = 'Hello world';
        // Index 0: 'H'
        expect(getTextPositionMessage(text, 0)).toBe(
            'line 1, column 1\n' +
            'Hello world\n' +
            '^'
        );
        // Index 1: 'e'
        expect(getTextPositionMessage(text, 1)).toBe(
            'line 1, column 2\n' +
            'Hello world\n' +
            '-^'
        );
        // Index 10: 'd'
        expect(getTextPositionMessage(text, 10)).toBe(
            'line 1, column 11\n' +
            'Hello world\n' +
            '----------^'
        );
    });

    test('Multi-line text', () => {
        const text = 'line1\nline2\nline3';

        // Index 0: 'l' (line 1)
        expect(getTextPositionMessage(text, 0)).toBe(
            'line 1, column 1\n' +
            'line1\n' +
            '^'
        );

        // Index 5: '\n' (end of line 1)
        expect(getTextPositionMessage(text, 5)).toBe(
            'line 1, column 6\n' +
            'line1\n' +
            '-----^'
        );

        // Index 6: 'l' (line 2)
        expect(getTextPositionMessage(text, 6)).toBe(
            'line 2, column 1\n' +
            'line2\n' +
            '^'
        );

        // Index 8: 'n' (line 2) - 3rd char
        expect(getTextPositionMessage(text, 8)).toBe(
            'line 2, column 3\n' +
            'line2\n' +
            '--^'
        );
    });

    test('Empty string', () => {
        const text = '';
        expect(getTextPositionMessage(text, 0)).toBe(
            'line 1, column 1\n' +
            '\n' +
            '^'
        );
    });

    test('End of file index', () => {
        const text = 'abc';
        // Index 3: End of file
        expect(getTextPositionMessage(text, 3)).toBe(
            'line 1, column 4\n' +
            'abc\n' +
            '---^'
        );
    });

    test('Error handling', () => {
        expect(() => getTextPositionMessage('abc', -1)).toThrow('Wrong char index -1');
        expect(() => getTextPositionMessage('abc', NaN)).toThrow('Wrong char index NaN');
        expect(() => getTextPositionMessage('abc', Infinity)).toThrow('Wrong char index Infinity');
    });
});

import {parseColorSchemeConfig} from '../../../src/utils/colorscheme-parser';

const SEPERATOR = '='.repeat(32);

describe('parseColorSchemeConfig', () => {
    test('should parse a single light scheme', () => {
        const config = `MyTheme

LIGHT
background: #111111
text: #222222`;

        const {result, error} = parseColorSchemeConfig(config);
        expect(error).toBeNull();
        expect(result.light['MyTheme']).toEqual({
            backgroundColor: '#111111',
            textColor: '#222222',
        });
        expect(result.dark['MyTheme']).toBeUndefined();
    });

    test('should parse a single dark scheme', () => {
        const config = `MyTheme

DARK
background: #333333
text: #444444`;

        const {result, error} = parseColorSchemeConfig(config);
        expect(error).toBeNull();
        expect(result.dark['MyTheme']).toEqual({
            backgroundColor: '#333333',
            textColor: '#444444',
        });
        expect(result.light['MyTheme']).toBeUndefined();
    });

    test('should parse a scheme with both light and dark variants', () => {
        const config = `MyTheme

LIGHT
background: #111111
text: #222222

DARK
background: #333333
text: #444444`;

        const {result, error} = parseColorSchemeConfig(config);
        expect(error).toBeNull();
        expect(result.light['MyTheme']).toEqual({
            backgroundColor: '#111111',
            textColor: '#222222',
        });
        expect(result.dark['MyTheme']).toEqual({
            backgroundColor: '#333333',
            textColor: '#444444',
        });
    });

    test('should parse multiple schemes separated by separator', () => {
        const config = `AlphaTheme

LIGHT
background: #111111
text: #222222

DARK
background: #333333
text: #444444

${SEPERATOR}

BetaTheme

LIGHT
background: #555555
text: #666666`;

        const {result, error} = parseColorSchemeConfig(config);
        expect(error).toBeNull();
        expect(result.light['AlphaTheme']).toBeDefined();
        expect(result.dark['AlphaTheme']).toBeDefined();
        expect(result.light['BetaTheme']).toBeDefined();
        expect(result.dark['BetaTheme']).toBeUndefined();
    });

    test('should error if name is missing', () => {
        const config = `
LIGHT
background: #111111
text: #222222`;
        const {error} = parseColorSchemeConfig(config);
        expect(error).toBe('No color scheme name was found.');
    });

    test('should error if name is duplicate', () => {
        const config = `MyTheme

LIGHT
background: #111111
text: #222222

${SEPERATOR}

MyTheme

DARK
background: #333333
text: #444444`;

        const {error} = parseColorSchemeConfig(config);
        expect(error).toBe('The color scheme name "MyTheme" is already defined.');
    });

    test('should error if names are not in alphabetical order', () => {
        const config = `BetaTheme

LIGHT
background: #111111
text: #222222

${SEPERATOR}

AlphaTheme

LIGHT
background: #333333
text: #444444`;

        const {error} = parseColorSchemeConfig(config);
        expect(error).toBe('The color scheme name "AlphaTheme" is not in alphabetical order.');
    });

    test('should error if second line is not empty', () => {
        const config = `MyTheme
NotEmpty
LIGHT
background: #111111
text: #222222`;

        const {error} = parseColorSchemeConfig(config);
        expect(error).toBe('The second line of the color scheme "MyTheme" is not empty.');
    });

    test('should error if variant is invalid', () => {
        const config = `MyTheme

BLUE
background: #111111
text: #222222`;

        const {error} = parseColorSchemeConfig(config);
        expect(error).toBe('The 2nd line of the color scheme "MyTheme" is not a valid variant.');
    });

    test('should error if background property is missing or invalid', () => {
        const config = `MyTheme

LIGHT
color: #111111
text: #222222`;

        const {error} = parseColorSchemeConfig(config);
        expect(error).toBe('The 3rd line of the color scheme "MyTheme" is not background-color property.');
    });

    test('should error if text property is missing or invalid', () => {
        const config = `MyTheme

LIGHT
background: #111111
foreground: #222222`;

        const {error} = parseColorSchemeConfig(config);
        expect(error).toBe('The 4th line of the color scheme "MyTheme" is not text-color property.');
    });

    test('should error if hex color is invalid', () => {
        const config = `MyTheme

LIGHT
background: #GGGGGG
text: #222222`;

        const {error} = parseColorSchemeConfig(config);
        expect(error).toBe('The 3rd line of the color scheme "MyTheme" is not a valid hex color.');
    });

    test('should error if same variant is defined twice', () => {
        const config = `MyTheme

LIGHT
background: #111111
text: #222222

LIGHT
background: #333333
text: #444444`;

        const {error} = parseColorSchemeConfig(config);
        expect(error).toBe('The color scheme "MyTheme" has the same variant twice.');
    });

    test('should error if structure is incorrect (extra lines)', () => {
         const config = `MyTheme

LIGHT
background: #111111
text: #222222

DARK
background: #333333
text: #444444

ExtraLine`;

        const {error} = parseColorSchemeConfig(config);
        expect(error).toBe('The color scheme "MyTheme" doesn\'t end with 1 new line.');
    });
});

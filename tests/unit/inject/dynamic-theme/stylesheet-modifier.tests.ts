/**
 * @jest-environment jsdom
 */
import {createStyleSheetModifier} from '../../../../src/inject/dynamic-theme/stylesheet-modifier';
import {getModifiableCSSDeclaration} from '../../../../src/inject/dynamic-theme/modify-css';

// Mock dependencies
jest.mock('../../../../src/inject/dynamic-theme/modify-css', () => ({
    getModifiableCSSDeclaration: jest.fn(),
}));

jest.mock('../../../../src/inject/dynamic-theme/variables', () => ({
    variablesStore: {},
}));

jest.mock('../../../../src/inject/dynamic-theme/css-rules', () => ({
    iterateCSSRules: (rules: any, iterate: any) => rules.forEach(iterate),
    iterateCSSDeclarations: (style: any, iterate: any) => Object.entries(style).forEach(([k, v]) => iterate(k, v)),
    isMediaRule: () => false,
    isLayerRule: () => false,
    isStyleRule: () => true,
}));

jest.mock('../../../../src/inject/dynamic-theme/modify-colors', () => ({
    themeCacheKeys: ['mode'],
}));

describe('StyleSheetModifier Optimization', () => {
    it('should correctly update CSS variables', () => {
        const modifier = createStyleSheetModifier();
        const mockGetModifiableCSSDeclaration = getModifiableCSSDeclaration as jest.Mock;

        const listeners = new Map<string, (declarations: any[]) => void>();

        mockGetModifiableCSSDeclaration.mockImplementation((property, value) => {
             if (property.startsWith('--')) {
                 const modifier = () => ({
                     declarations: [{property, value: 'initial', important: false, sourceValue: value}],
                     onTypeChange: {
                         addListener: (cb: any) => listeners.set(property, cb),
                         removeListeners: () => listeners.delete(property),
                     }
                 });
                 return {property, value: modifier, important: false, sourceValue: value};
             }
             return {property, value: 'modified', important: false, sourceValue: value};
        });

        const cssRules = [
            {
                parentRule: null,
                selectorText: '.target',
                cssText: '.target { --var1: val1; color: red; --var2: val2; }',
                style: {
                    '--var1': 'val1',
                    'color': 'red',
                    '--var2': 'val2',
                }
            }
        ];

        const insertedRules: string[] = [];
        const builder = {
            deleteRule: (index: number) => {
                insertedRules[index] = '';
            },
            insertRule: (rule: string, index: number) => {
                insertedRules[index] = rule;
                return index;
            },
            cssRules: {
                get length() { return insertedRules.length; }
            },
        };

        const theme = {mode: 1} as any;

        modifier.modifySheet({
            sourceCSSRules: cssRules as any,
            theme,
            ignoreImageAnalysis: [],
            force: false,
            prepareSheet: () => builder as any,
            isAsyncCancelled: () => false,
        });

        // Verify initial state
        expect(insertedRules[0]).toContain('--var1: initial');
        expect(insertedRules[0]).toContain('color: modified');
        expect(insertedRules[0]).toContain('--var2: initial');

        // Update --var1
        const updateVar1 = listeners.get('--var1');
        expect(updateVar1).toBeDefined();

        updateVar1!([
            {property: '--var1', value: 'updated1-a', important: false, sourceValue: 'val1'},
            {property: '--var1-b', value: 'updated1-b', important: false, sourceValue: 'val1'},
        ]);

        // Should trigger rebuildVarRule
        expect(insertedRules[0]).toContain('--var1: updated1-a');
        expect(insertedRules[0]).toContain('--var1-b: updated1-b');
        expect(insertedRules[0]).toContain('color: modified');
        expect(insertedRules[0]).toContain('--var2: initial');

        // Update --var2
        const updateVar2 = listeners.get('--var2');
        expect(updateVar2).toBeDefined();

        updateVar2!([
            {property: '--var2', value: 'updated2', important: false, sourceValue: 'val2'},
        ]);

        expect(insertedRules[0]).toContain('--var1: updated1-a');
        expect(insertedRules[0]).toContain('--var1-b: updated1-b');
        expect(insertedRules[0]).toContain('color: modified');
        expect(insertedRules[0]).toContain('--var2: updated2');
    });
});

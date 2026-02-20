
// Set up globals before imports
Object.assign(global, {
    document: {
        readyState: 'complete',
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        createElement: jest.fn(),
        head: { appendChild: jest.fn() },
        documentElement: { style: {} },
    },
    window: {
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
    },
    navigator: {
        userAgent: 'test',
        platform: 'test',
    },
    location: {
        href: 'http://localhost/',
        hostname: 'localhost',
    },
    CustomEvent: class {},
    CSSStyleRule: class {},
    CSSMediaRule: class {},
    CSSStyleSheet: class {},
    chrome: {
        runtime: {
            onMessage: {
                addListener: jest.fn(),
                removeListener: jest.fn(),
            },
        },
    },
});

import {createStyleSheetModifier} from '../../../../src/inject/dynamic-theme/stylesheet-modifier';
import {getModifiableCSSDeclaration} from '../../../../src/inject/dynamic-theme/modify-css';
import {Theme} from '../../../../src/definitions';

// Mock dependencies
jest.mock('../../../../src/inject/dynamic-theme/modify-css');
jest.mock('../../../../src/inject/dynamic-theme/css-rules', () => {
    return {
        iterateCSSRules: (rules: any[], iterate: (rule: any) => void) => {
            rules.forEach(iterate);
        },
        iterateCSSDeclarations: (style: any, iterate: (prop: string, val: string) => void) => {
            if (style.__declarations) {
                style.__declarations.forEach(([prop, val]: [string, string]) => iterate(prop, val));
            }
        },
        isMediaRule: () => false,
        isLayerRule: () => false,
        isStyleRule: () => true,
    };
});
jest.mock('../../../../src/inject/dynamic-theme/variables', () => ({
    variablesStore: {},
    CSSVariableModifier: {},
}));

describe('StyleSheetModifier Optimization', () => {
    let modifier: ReturnType<typeof createStyleSheetModifier>;
    let mockPrepareSheet: jest.Mock;
    let mockDeleteRule: jest.Mock;
    let mockInsertRule: jest.Mock;
    let cssRules: any[];

    beforeEach(() => {
        modifier = createStyleSheetModifier();
        cssRules = [];
        mockDeleteRule = jest.fn();
        mockInsertRule = jest.fn();
        mockPrepareSheet = jest.fn().mockReturnValue({
            deleteRule: mockDeleteRule,
            insertRule: mockInsertRule,
            cssRules: cssRules,
        });
        (getModifiableCSSDeclaration as jest.Mock).mockReset();
    });

    function createMockRule(selector: string, declarations: [string, string][]) {
        return {
            selectorText: selector,
            style: {
                __declarations: declarations,
                getPropertyValue: (prop: string) => {
                    const found = declarations.find(d => d[0] === prop);
                    return found ? found[1] : '';
                },
                getPropertyPriority: () => '',
            },
            parentRule: null,
            cssText: selector + ' { ... }'
        };
    }

    it('should handle variable updates correctly using optimized structure', () => {
        const rule = createMockRule('.test', [
            ['--var-1', 'red'],
            ['color', 'var(--var-1)'],
        ]);
        // (rule as any).parentRule = rule;

        const onTypeChangeListeners: Set<(decs: any[]) => void> = new Set();

        const varModifier = {
            declarations: [] as any[],
            onTypeChange: {
                addListener: (cb: any) => onTypeChangeListeners.add(cb),
                removeListeners: jest.fn(),
            }
        };

        (getModifiableCSSDeclaration as jest.Mock).mockImplementation((prop, value) => {
            if (prop === '--var-1') {
                return {
                    property: prop,
                    value: (theme: any) => varModifier,
                    important: false,
                    sourceValue: value,
                };
            }
            return {
                property: prop,
                value: 'modified-color',
                important: false,
                sourceValue: value,
            };
        });

        // Trigger modification
        modifier.modifySheet({
            sourceCSSRules: [rule] as any,
            theme: {} as Theme,
            ignoreImageAnalysis: [],
            force: false,
            prepareSheet: mockPrepareSheet,
            isAsyncCancelled: () => false,
        });

        // Verify initial state
        // console.log(mockInsertRule.mock.calls);
        expect(getModifiableCSSDeclaration).toHaveBeenCalled();
        expect(mockInsertRule).toHaveBeenCalledWith('.test { --var-1: red; color: modified-color; }', 0);

        // Reset mocks
        mockDeleteRule.mockClear();
        mockInsertRule.mockClear();
        cssRules.push({});

        // Update variable to produce declarations
        varModifier.declarations = [
            { property: '--var-1-mod', value: 'blue' }
        ];

        // Notify listeners
        onTypeChangeListeners.forEach(cb => cb(varModifier.declarations));

        // Expect update
        expect(mockDeleteRule).toHaveBeenCalled();
        expect(mockInsertRule).toHaveBeenCalled();

        const insertedRule = mockInsertRule.mock.calls[0][0];
        expect(insertedRule).toContain('--var-1-mod: blue');
        expect(insertedRule).toContain('color: modified-color');
    });

    it('should handle replacing empty variable declarations', () => {
        const rule = createMockRule('.test', [['--var-2', 'val']]);
        // (rule as any).parentRule = rule;

        const onTypeChangeListeners: Set<(decs: any[]) => void> = new Set();
        const varModifier = {
            declarations: [] as any[],
            onTypeChange: {
                addListener: (cb: any) => onTypeChangeListeners.add(cb),
                removeListeners: jest.fn(),
            }
        };

        (getModifiableCSSDeclaration as jest.Mock).mockReturnValue({
            property: '--var-2',
            value: (theme: any) => varModifier,
            important: false,
            sourceValue: 'val',
        });

        modifier.modifySheet({
            sourceCSSRules: [rule] as any,
            theme: {} as Theme,
            ignoreImageAnalysis: [],
            force: false,
            prepareSheet: mockPrepareSheet,
            isAsyncCancelled: () => false,
        });

        expect(mockInsertRule).toHaveBeenCalledWith('.test { --var-2: val; }', 0);

        mockDeleteRule.mockClear();
        mockInsertRule.mockClear();
        cssRules.push({});

        varModifier.declarations = [{ property: '--var-2-mod', value: 'green' }];
        onTypeChangeListeners.forEach(cb => cb(varModifier.declarations));

        expect(mockInsertRule).toHaveBeenCalledWith('.test { --var-2-mod: green; }', 0);

        mockDeleteRule.mockClear();
        mockInsertRule.mockClear();
        cssRules[0] = {};

        varModifier.declarations = [];
        onTypeChangeListeners.forEach(cb => cb(varModifier.declarations));

        // The implementation behavior when newDecs is empty is to remove previous declarations.
        // If it was valid before, it should now be valid but without the variable.
        // Currently with Array logic, splice removes items.
        // If there are no other declarations, the rule becomes empty: ".test { }"
        expect(mockInsertRule).toHaveBeenCalled();
        const ruleText = mockInsertRule.mock.calls[0][0];
        // It might be ".test { }" or similar.
    });
});

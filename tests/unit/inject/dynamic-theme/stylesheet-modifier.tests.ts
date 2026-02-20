/** @jest-environment jsdom */

Object.assign(global, {
    chrome: {
        runtime: {
            onMessage: {
                addListener: jest.fn(),
                removeListener: jest.fn(),
            },
            sendMessage: jest.fn(),
        },
    },
});

// Mock variablesStore to avoid importing modify-colors -> stubs -> theme which fails resolution
jest.mock('../../../../src/inject/dynamic-theme/variables', () => ({
    variablesStore: {
        getModifierForVariable: () => null,
        getModifierForVarDependant: () => null,
    },
}));

import {createStyleSheetModifier} from '../../../../src/inject/dynamic-theme/stylesheet-modifier';
import type {CSSBuilder} from '../../../../src/inject/dynamic-theme/stylesheet-modifier';
import type {Theme} from '../../../../src/definitions';
import {ThemeEngine} from '../../../../src/generators/theme-engines';

describe('StyleSheetModifier', () => {
    const theme: Theme = {
        mode: 1,
        brightness: 100,
        contrast: 100,
        grayscale: 0,
        sepia: 0,
        useFont: false,
        fontFamily: '',
        textStroke: 0,
        engine: ThemeEngine.dynamicTheme,
        stylesheet: '',
        darkSchemeBackgroundColor: '#181a1b',
        darkSchemeTextColor: '#e8e6e3',
        lightSchemeBackgroundColor: '#dcdad7',
        lightSchemeTextColor: '#181a1b',
        scrollbarColor: 'auto',
        selectionColor: 'auto',
        styleSystemControls: false,
        lightColorScheme: 'Default',
        darkColorScheme: 'Default',
        immediateModify: false,
    };

    it('should skip rules with style.all === "revert" (current behavior)', () => {
        const modifier = createStyleSheetModifier();

        const ruleMock = {
            type: 1, // CSSRule.STYLE_RULE
            selectorText: '.test',
            style: {
                all: 'revert',
                getPropertyValue: (prop: string) => prop === 'all' ? 'revert' : '',
                getPropertyPriority: (_prop: string) => '',
                length: 1,
                0: 'all',
                cssText: 'all: revert;',
            },
            parentRule: null,
            cssText: '.test { all: revert; }',
        };

        const insertRule = jest.fn();
        const prepareSheet = () => ({
            deleteRule: jest.fn(),
            insertRule,
            cssRules: {length: 0},
        } as unknown as CSSBuilder);

        modifier.modifySheet({
            sourceCSSRules: [ruleMock as unknown as CSSRule],
            theme,
            ignoreImageAnalysis: [],
            force: false,
            prepareSheet,
            isAsyncCancelled: () => false,
        });

        expect(insertRule).not.toHaveBeenCalled();
    });

    it('should handle exceptions when setRule fails', () => {
        const modifier = createStyleSheetModifier();

        const ruleMock = {
            type: 1, // CSSRule.STYLE_RULE
            selectorText: '.test',
            style: {
                getPropertyValue: (prop: string) => prop === 'color' ? 'red' : '',
                getPropertyPriority: (_prop: string) => '',
                length: 1,
                0: 'color',
                cssText: 'color: red;',
            },
            parentRule: null,
            cssText: '.test { color: red; }',
        };

        const insertRule = jest.fn().mockImplementation(() => {
            throw new Error('SVG Error');
        });
        const prepareSheet = () => ({
            deleteRule: jest.fn(),
            insertRule,
            cssRules: {length: 0},
        } as unknown as CSSBuilder);

        expect(() => {
            modifier.modifySheet({
                sourceCSSRules: [ruleMock as unknown as CSSRule],
                theme,
                ignoreImageAnalysis: [],
                force: false,
                prepareSheet,
                isAsyncCancelled: () => false,
            });
        }).not.toThrow();
    });
});

import type {Theme} from '../../definitions';
import {isChromium} from '../../utils/platform';
import {getHashCode} from '../../utils/text';
import {createAsyncTasksQueue} from '../../utils/throttle';

import {iterateCSSRules, iterateCSSDeclarations, isMediaRule, isLayerRule, isStyleRule} from './css-rules';
import {themeCacheKeys} from './modify-colors';
import type {ModifiableCSSDeclaration, ModifiableCSSRule, CSSValueModifierWithSubscription} from './modify-css';
import {getModifiableCSSDeclaration} from './modify-css';
import {variablesStore} from './variables';
import type {CSSVariableModifier} from './variables';

function getThemeKey(theme: Theme) {
    let resultKey = '';
    themeCacheKeys.forEach((key) => {
        resultKey += `${key}:${theme[key]};`;
    });
    return resultKey;
}

const asyncQueue = createAsyncTasksQueue();

interface ModifySheetOptions {
    sourceCSSRules: CSSRuleList | CSSRule[];
    theme: Theme;
    ignoreImageAnalysis: string[];
    force: boolean;
    prepareSheet: () => CSSBuilder;
    isAsyncCancelled: () => boolean;
}

interface StyleSheetModifier {
    modifySheet: (options: ModifySheetOptions) => void;
    shouldRebuildStyle: () => boolean;
}

export interface CSSBuilder {
    deleteRule(index: number): void;
    insertRule(rule: string, index?: number): number;
    cssRules: {
        readonly length: number;
        [index: number]: CSSBuilder | object;
    };
}

export function createStyleSheetModifier(): StyleSheetModifier {
    let renderId = 0;

    function getStyleRuleHash(rule: CSSStyleRule) {
        let cssText = rule.cssText;
        if (isMediaRule(rule.parentRule)) {
            cssText = `${rule.parentRule.media.mediaText} { ${cssText} }`;
        }
        if (isLayerRule(rule.parentRule)) {
            cssText = `${rule.parentRule.name} { ${cssText} }`;
        }
        return getHashCode(cssText);
    }

    const rulesTextCache = new Set<number>();
    const rulesModCache = new Map<number, ModifiableCSSRule>();
    const varTypeChangeCleaners = new Set<() => void>();
    let prevFilterKey: string | null = null;
    let hasNonLoadedLink = false;
    let wasRebuilt = false;
    function shouldRebuildStyle() {
        return hasNonLoadedLink && !wasRebuilt;
    }

    function modifySheet(options: ModifySheetOptions) {
        const rules = options.sourceCSSRules;
        const {theme, ignoreImageAnalysis, force, prepareSheet, isAsyncCancelled} = options;

        let rulesChanged = (rulesModCache.size === 0);
        const notFoundCacheKeys = new Set(rulesModCache.keys());
        const themeKey = getThemeKey(theme);
        const themeChanged = (themeKey !== prevFilterKey);

        if (hasNonLoadedLink) {
            wasRebuilt = true;
        }

        const modRules: ModifiableCSSRule[] = [];
        iterateCSSRules(rules, (rule) => {
            const hash = getStyleRuleHash(rule);
            let textDiffersFromPrev = false;

            notFoundCacheKeys.delete(hash);
            if (!rulesTextCache.has(hash)) {
                rulesTextCache.add(hash);
                textDiffersFromPrev = true;
            }

            if (textDiffersFromPrev) {
                rulesChanged = true;
            } else {
                modRules.push(rulesModCache.get(hash)!);
                return;
            }

            // A very specific case to skip. This causes a lot of calls to `getModifiableCSSDeclaration`
            // and currently contributes nothing in real-world case.
            // TODO: Allow `setRule` to throw a exception when we're modifying SVGs namespace styles.
            if (rule.style.all === 'revert') {
                return;
            }

            const modDecs: ModifiableCSSDeclaration[] = [];
            rule.style && iterateCSSDeclarations(rule.style, (property, value) => {
                const mod = getModifiableCSSDeclaration(property, value, rule, variablesStore, ignoreImageAnalysis, isAsyncCancelled);
                if (mod) {
                    modDecs.push(mod);
                }
            });

            let modRule: ModifiableCSSRule | null = null;
            if (modDecs.length > 0) {
                const parentRule = rule.parentRule!;
                modRule = {selector: rule.selectorText, declarations: modDecs, parentRule};
                modRules.push(modRule);
            }
            rulesModCache.set(hash, modRule!);
        }, () => {
            hasNonLoadedLink = true;
        });

        notFoundCacheKeys.forEach((key) => {
            rulesTextCache.delete(key);
            rulesModCache.delete(key);
        });
        prevFilterKey = themeKey;

        if (!force && !rulesChanged && !themeChanged) {
            return;
        }

        renderId++;

        interface ReadyGroup {
            isGroup: true;
            rule: CSSRule | null;
            rules: Array<ReadyGroup | ReadyStyleRule>;
        }

        interface VariableSlot {
            isSlot: true;
            declarations: ReadyDeclaration[];
            varKey: number;
        }

        interface ReadyStyleRule {
            isGroup: false;
            selector: string;
            declarations: Array<ReadyDeclaration | VariableSlot>;
        }

        interface ReadyDeclaration {
            property: string;
            value: string | Array<{property: string; value: string}> | null;
            important: boolean;
            sourceValue: string;
            asyncKey?: number;
            varKey?: number;
        }

        function setRule(target: CSSBuilder, index: number, rule: ReadyStyleRule) {
            const {selector, declarations} = rule;

            let selectorText = selector;
            // Empty :is() and :where() selectors or
            // selectors like :is(:where(:-unknown))
            // break Chrome 119 when calling deleteRule()
            const emptyIsWhereSelector = isChromium && selector.startsWith(':is(') && (
                selector.includes(':is()') ||
                selector.includes(':where()') ||
                (selector.includes(':where(') && selector.includes(':-moz'))
            );
            const viewTransitionSelector = selector.includes('::view-transition-');
            if (emptyIsWhereSelector || viewTransitionSelector) {
                selectorText = '.darkreader-unsupported-selector';
            }
            // ::picker(select) becomes ::picker,
            // but cannot be parsed later (Chrome bug)
            if (isChromium && selectorText.endsWith('::picker')) {
                selectorText = selectorText.replaceAll('::picker', '::picker(select)');
            }

            let ruleText = `${selectorText} {`;
            for (const dec of declarations) {
                if ('isSlot' in dec) {
                    for (const subDec of dec.declarations) {
                        const {property, value, important} = subDec;
                        if (value) {
                            ruleText += ` ${property}: ${value}${important ? ' !important' : ''};`;
                        }
                    }
                } else {
                    const {property, value, important} = dec;
                    if (value) {
                        ruleText += ` ${property}: ${value}${important ? ' !important' : ''};`;
                    }
                }
            }
            ruleText += ' }';

            target.insertRule(ruleText, index);
        }

        interface RuleInfo {
            rule: ReadyStyleRule;
            target: CSSBuilder;
            index: number;
        }

        const asyncDeclarations = new Map<number, RuleInfo>();
        const varDeclarations = new Map<number, RuleInfo>();
        let asyncDeclarationCounter = 0;
        let varDeclarationCounter = 0;

        const rootReadyGroup: ReadyGroup = {rule: null, rules: [], isGroup: true};
        const groupRefs = new WeakMap<CSSRule, ReadyGroup>();

        function getGroup(rule: CSSRule): ReadyGroup {
            if (rule == null) {
                return rootReadyGroup;
            }

            if (groupRefs.has(rule)) {
                return groupRefs.get(rule)!;
            }

            const group: ReadyGroup = {rule, rules: [], isGroup: true};
            groupRefs.set(rule, group);

            const parentGroup = getGroup(rule.parentRule!);
            parentGroup.rules.push(group);

            return group;
        }

        varTypeChangeCleaners.forEach((clear) => clear());
        varTypeChangeCleaners.clear();

        modRules.filter((r) => r).forEach(({selector, declarations, parentRule}) => {
            const group = getGroup(parentRule);
            const readyStyleRule: ReadyStyleRule = {selector, declarations: [], isGroup: false};
            const readyDeclarations = readyStyleRule.declarations;
            group.rules.push(readyStyleRule);

            function handleAsyncDeclaration(
                property: string,
                modified: Promise<string | null>,
                important: boolean,
                sourceValue: string,
                targetArray: {push: (d: ReadyDeclaration) => void} = readyDeclarations
            ) {
                const asyncKey = ++asyncDeclarationCounter;
                const asyncDeclaration: ReadyDeclaration = {property, value: null, important, asyncKey, sourceValue};
                targetArray.push(asyncDeclaration);
                const currentRenderId = renderId;
                modified.then((asyncValue) => {
                    if (!asyncValue || isAsyncCancelled() || currentRenderId !== renderId) {
                        return;
                    }
                    asyncDeclaration.value = asyncValue;
                    asyncQueue.add(() => {
                        if (isAsyncCancelled() || currentRenderId !== renderId) {
                            return;
                        }
                        rebuildAsyncRule(asyncKey);
                    });
                });
            }

            function handleVarDeclarations(property: string, modified: ReturnType<CSSVariableModifier>, important: boolean, sourceValue: string) {
                const {declarations: varDecs, onTypeChange} = modified;
                const varKey = ++varDeclarationCounter;
                const currentRenderId = renderId;

                const variableSlot: VariableSlot = {
                    isSlot: true,
                    declarations: [],
                    varKey,
                };

                readyDeclarations.push(variableSlot);
                const slotDeclarations = variableSlot.declarations;

                if (varDecs.length === 0) {
                    const tempDec = {property, value: sourceValue, important, sourceValue, varKey};
                    slotDeclarations.push(tempDec);
                }
                varDecs.forEach((mod) => {
                    if (mod.value instanceof Promise) {
                        handleAsyncDeclaration(mod.property, mod.value, important, sourceValue, slotDeclarations);
                    } else {
                        const readyDec = {property: mod.property, value: mod.value, important, sourceValue, varKey};
                        slotDeclarations.push(readyDec);
                    }
                });
                onTypeChange.addListener((newDecs) => {
                    if (isAsyncCancelled() || currentRenderId !== renderId) {
                        return;
                    }
                    const readyVarDecs = newDecs.map((mod) => {
                        return {property: mod.property, value: mod.value as string, important, sourceValue, varKey};
                    });

                    variableSlot.declarations = readyVarDecs;
                    rebuildVarRule(varKey);
                });
                varTypeChangeCleaners.add(() => onTypeChange.removeListeners());
            }

            function handleValueWithSubscription(property: string, modified: CSSValueModifierWithSubscription, important: boolean, sourceValue: string) {
                const {value, onTypeChange} = modified;
                const varKey = ++varDeclarationCounter;
                const currentRenderId = renderId;

                const readyDec: ReadyDeclaration = {property, value: null, important, sourceValue, varKey};
                readyDeclarations.push(readyDec);

                const updateValue = (val: string | null) => {
                    readyDec.value = val;
                    rebuildVarRule(varKey);
                };

                if (value instanceof Promise) {
                    value.then((asyncValue) => {
                        if (!asyncValue || isAsyncCancelled() || currentRenderId !== renderId) {
                            return;
                        }
                        updateValue(asyncValue);
                    });
                } else {
                    readyDec.value = value;
                }

                onTypeChange.addListener((newValue) => {
                    if (isAsyncCancelled() || currentRenderId !== renderId) {
                        return;
                    }
                    if (newValue instanceof Promise) {
                        newValue.then((asyncValue) => {
                            if (!asyncValue || isAsyncCancelled() || currentRenderId !== renderId) {
                                return;
                            }
                            updateValue(asyncValue);
                        });
                    } else {
                        updateValue(newValue);
                    }
                });
                varTypeChangeCleaners.add(() => onTypeChange.removeListeners());
            }

            declarations.forEach(({property, value, important, sourceValue}) => {
                if (typeof value === 'function') {
                    const modified = value(theme);
                    if (modified instanceof Promise) {
                        handleAsyncDeclaration(property, modified, important, sourceValue);
                    } else if (property.startsWith('--')) {
                        handleVarDeclarations(property, modified as any, important, sourceValue);
                    } else if (typeof modified === 'object' && modified !== null && 'onTypeChange' in modified) {
                        handleValueWithSubscription(property, modified as CSSValueModifierWithSubscription, important, sourceValue);
                    } else {
                        readyDeclarations.push({property, value: modified as string, important, sourceValue});
                    }
                } else {
                    readyDeclarations.push({property, value, important, sourceValue});
                }
            });
        });

        const sheet = prepareSheet();

        function buildStyleSheet() {
            function createTarget(group: ReadyGroup, parent: CSSBuilder): CSSBuilder {
                const {rule} = group;
                if (isStyleRule(rule)) {
                    const {selectorText} = rule;
                    const index = parent.cssRules.length;
                    parent.insertRule(`${selectorText} {}`, index);
                    return parent.cssRules[index] as CSSBuilder;
                }
                if (isMediaRule(rule)) {
                    const {media} = rule;
                    const index = parent.cssRules.length;
                    parent.insertRule(`@media ${media.mediaText} {}`, index);
                    return parent.cssRules[index] as CSSBuilder;
                }
                if (isLayerRule(rule)) {
                    const {name} = rule;
                    const index = parent.cssRules.length;
                    parent.insertRule(`@layer ${name} {}`, index);
                    return parent.cssRules[index] as CSSBuilder;
                }
                return parent;
            }

            function iterateReadyRules(
                group: ReadyGroup,
                target: CSSBuilder,
                styleIterator: (s: ReadyStyleRule, t: CSSBuilder) => void,
            ) {
                group.rules.forEach((r) => {
                    if (r.isGroup) {
                        const t = createTarget(r, target);
                        iterateReadyRules(r, t, styleIterator);
                    } else {
                        styleIterator(r as ReadyStyleRule, target);
                    }
                });
            }

            iterateReadyRules(rootReadyGroup, sheet, (rule, target) => {
                const index = target.cssRules.length;
                rule.declarations.forEach((decl) => {
                    if ('isSlot' in decl) {
                        if (decl.varKey != null) {
                            varDeclarations.set(decl.varKey, {rule, target, index});
                        }
                        decl.declarations.forEach((d) => {
                            if (d.asyncKey != null) {
                                asyncDeclarations.set(d.asyncKey, {rule, target, index});
                            }
                        });
                    } else {
                        const {asyncKey, varKey} = decl;
                        if (asyncKey != null) {
                            asyncDeclarations.set(asyncKey, {rule, target, index});
                        }
                        if (varKey != null) {
                            varDeclarations.set(varKey, {rule, target, index});
                        }
                    }
                });
                setRule(target, index, rule);
            });
        }

        function rebuildAsyncRule(key: number) {
            const {rule, target, index} = asyncDeclarations.get(key)!;
            target.deleteRule(index);
            setRule(target, index, rule);
            asyncDeclarations.delete(key);
        }

        function rebuildVarRule(key: number) {
            const {rule, target, index} = varDeclarations.get(key)!;
            target.deleteRule(index);
            setRule(target, index, rule);
        }

        buildStyleSheet();
    }

    return {modifySheet, shouldRebuildStyle};
}

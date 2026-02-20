import type {Theme} from '../../definitions';
import {isChromium} from '../../utils/platform';
import {getHashCode} from '../../utils/text';
import {createAsyncTasksQueue} from '../../utils/throttle';

import {iterateCSSRules, iterateCSSDeclarations, isMediaRule, isLayerRule, isStyleRule} from './css-rules';
import {themeCacheKeys} from './modify-colors';
import type {ModifiableCSSDeclaration, ModifiableCSSRule} from './modify-css';
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

        interface ReadyStyleRule {
            isGroup: false;
            selector: string;
            declarations: ReadyDeclaration | null;
            declarationsTail: ReadyDeclaration | null;
        }

        interface ReadyDeclaration {
            property: string;
            value: string | Array<{property: string; value: string}> | null;
            important: boolean;
            sourceValue: string;
            asyncKey?: number;
            varKey?: number;
            next: ReadyDeclaration | null;
            prev: ReadyDeclaration | null;
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
            let dec = declarations;
            while (dec) {
                const {property, value, important} = dec;
                if (value) {
                    ruleText += ` ${property}: ${value}${important ? ' !important' : ''};`;
                }
                dec = dec.next;
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
            const readyStyleRule: ReadyStyleRule = {selector, declarations: null, declarationsTail: null, isGroup: false};
            group.rules.push(readyStyleRule);

            function appendDeclaration(declaration: ReadyDeclaration) {
                if (readyStyleRule.declarationsTail) {
                    readyStyleRule.declarationsTail.next = declaration;
                    declaration.prev = readyStyleRule.declarationsTail;
                    readyStyleRule.declarationsTail = declaration;
                } else {
                    readyStyleRule.declarations = declaration;
                    readyStyleRule.declarationsTail = declaration;
                }
            }

            function handleAsyncDeclaration(property: string, modified: Promise<string | null>, important: boolean, sourceValue: string) {
                const asyncKey = ++asyncDeclarationCounter;
                const asyncDeclaration: ReadyDeclaration = {property, value: null, important, asyncKey, sourceValue, next: null, prev: null};
                appendDeclaration(asyncDeclaration);
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
                return asyncDeclaration;
            }

            function handleVarDeclarations(property: string, modified: ReturnType<CSSVariableModifier>, important: boolean, sourceValue: string) {
                const {declarations: varDecs, onTypeChange} = modified;
                const varKey = ++varDeclarationCounter;
                const currentRenderId = renderId;

                let firstNode: ReadyDeclaration | null = null;
                let lastNode: ReadyDeclaration | null = null;

                const createNode = (property: string, value: string | null, important: boolean, sourceValue: string): ReadyDeclaration => {
                    return {property, value, important, sourceValue, varKey, next: null, prev: null};
                };

                if (varDecs.length === 0) {
                    const tempDec = createNode(property, sourceValue, important, sourceValue);
                    appendDeclaration(tempDec);
                    firstNode = tempDec;
                    lastNode = tempDec;
                }
                varDecs.forEach((mod) => {
                    let node: ReadyDeclaration;
                    if (mod.value instanceof Promise) {
                        node = handleAsyncDeclaration(mod.property, mod.value, important, sourceValue);
                    } else {
                        node = createNode(mod.property, mod.value as string, important, sourceValue);
                        appendDeclaration(node);
                    }
                    if (!firstNode) {
                        firstNode = node;
                    }
                    lastNode = node;
                });

                onTypeChange.addListener((newDecs) => {
                    if (isAsyncCancelled() || currentRenderId !== renderId) {
                        return;
                    }
                    const newNodes: ReadyDeclaration[] = newDecs.map((mod) => {
                        return createNode(mod.property, mod.value as string, important, sourceValue);
                    });
                    if (newNodes.length === 0) {
                        newNodes.push(createNode(property, null, important, sourceValue));
                    }

                    const newHead = newNodes[0];
                    const newTail = newNodes[newNodes.length - 1];

                    // Link new nodes
                    for (let i = 0; i < newNodes.length - 1; i++) {
                        newNodes[i].next = newNodes[i + 1];
                        newNodes[i + 1].prev = newNodes[i];
                    }

                    // Replace range [firstNode, lastNode]
                    const prev = firstNode!.prev;
                    const next = lastNode!.next;

                    if (prev) {
                        prev.next = newHead;
                        newHead.prev = prev;
                    } else {
                        readyStyleRule.declarations = newHead;
                        newHead.prev = null;
                    }

                    if (next) {
                        next.prev = newTail;
                        newTail.next = next;
                    } else {
                        readyStyleRule.declarationsTail = newTail;
                        newTail.next = null;
                    }

                    firstNode = newHead;
                    lastNode = newTail;

                    rebuildVarRule(varKey);
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
                    } else {
                        appendDeclaration({property, value: modified as string, important, sourceValue, next: null, prev: null});
                    }
                } else {
                    appendDeclaration({property, value, important, sourceValue, next: null, prev: null});
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
                let dec = rule.declarations;
                while (dec) {
                    const {asyncKey, varKey} = dec;
                    if (asyncKey != null) {
                        asyncDeclarations.set(asyncKey, {rule, target, index});
                    }
                    if (varKey != null) {
                        varDeclarations.set(varKey, {rule, target, index});
                    }
                    dec = dec.next;
                }
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

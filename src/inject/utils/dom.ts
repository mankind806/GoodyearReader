import {forEach} from '../../utils/array';
import {throttle} from '../../utils/throttle';
import {getDuration} from '../../utils/time';
import {logWarn} from '../utils/log';

interface CreateNodeAsapParams {
    selectNode: () => HTMLElement;
    createNode: (target: HTMLElement) => void;
    updateNode: (existing: HTMLElement) => void;
    selectTarget: () => HTMLElement;
    createTarget: () => HTMLElement;
    isTargetMutation: (mutation: MutationRecord) => boolean;
}

interface NodePosetionWatcher {
    run: () => void;
    stop: () => void;
    skip: () => void;
}

export function createNodeAsap({
    selectNode,
    createNode,
    updateNode,
    selectTarget,
    createTarget,
    isTargetMutation,
}: CreateNodeAsapParams): void {
    const target = selectTarget();
    if (target) {
        const prev = selectNode();
        if (prev) {
            updateNode(prev);
        } else {
            createNode(target);
        }
    } else {
        const observer = new MutationObserver((mutations) => {
            const mutation = mutations.find(isTargetMutation);
            if (mutation) {
                unsubscribe();
                const target = selectTarget();
                selectNode() || createNode(target);
            }
        });

        const ready = () => {
            if (document.readyState !== 'complete') {
                return;
            }

            unsubscribe();
            const target = selectTarget() || createTarget();
            selectNode() || createNode(target);
        };

        const unsubscribe = () => {
            document.removeEventListener('readystatechange', ready);
            observer.disconnect();
        };

        if (document.readyState === 'complete') {
            ready();
        } else {
            // readystatechange event is not cancellable and does not bubble
            document.addEventListener('readystatechange', ready);
            observer.observe(document, {childList: true, subtree: true});
        }
    }
}

export function removeNode(node: Node | null): void {
    node && node.parentNode && node.parentNode.removeChild(node);
}

export function watchForNodePosition<T extends Node>(
    node: T,
    mode: 'head' | 'prev-sibling',
    onRestore = Function.prototype,
): NodePosetionWatcher {
    const MAX_ATTEMPTS_COUNT = 10;
    const RETRY_TIMEOUT = getDuration({seconds: 2});
    const ATTEMPTS_INTERVAL = getDuration({seconds: 10});
    let prevSibling = node.previousSibling;
    let parent = node.parentNode;
    if (!parent) {
        throw new Error('Unable to watch for node position: parent element not found');
    }
    if (mode === 'prev-sibling' && !prevSibling) {
        throw new Error('Unable to watch for node position: there is no previous sibling');
    }
    let attempts = 0;
    let start: number | null = null;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    const restore = throttle(() => {
        if (timeoutId) {
            return;
        }
        attempts++;
        const now = Date.now();
        if (start == null) {
            start = now;
        } else if (attempts >= MAX_ATTEMPTS_COUNT) {
            if (now - start < ATTEMPTS_INTERVAL) {
                logWarn(`Node position watcher paused: retry in ${RETRY_TIMEOUT}ms`, node, prevSibling);
                timeoutId = setTimeout(() => {
                    start = null;
                    attempts = 0;
                    timeoutId = undefined;
                    restore();
                }, RETRY_TIMEOUT);
                return;
            }
            start = now;
            attempts = 1;
        }

        if (mode === 'head') {
            if (prevSibling && prevSibling.parentNode !== parent) {
                logWarn('Sibling moved, moving node to the head end', node, prevSibling, parent);
                prevSibling = document.head.lastChild;
            }
        }

        if (mode === 'prev-sibling') {
            if (prevSibling!.parentNode == null) {
                logWarn('Unable to restore node position: sibling was removed', node, prevSibling, parent);
                stop();
                return;
            }
            if (prevSibling!.parentNode !== parent) {
                logWarn('Style was moved to another parent', node, prevSibling, parent);
                updateParent(prevSibling!.parentNode);
            }
        }

        // If parent becomes disconnected from the DOM, fetches the new head and
        // save that as parent. Do this only for the head mode, as those are
        // important nodes to keep.
        if (mode === 'head' && !parent!.isConnected) {
            parent = document.head;
            let sibling = parent.lastChild;
            prevSibling = null;
            while (sibling) {
                if (
                    sibling.nodeType === Node.ELEMENT_NODE &&
                    (sibling as Element).classList.contains('darkreader') &&
                    !(sibling as Element).classList.contains('darkreader--cors') &&
                    !(sibling as Element).classList.contains('darkreader--sync')
                ) {
                    prevSibling = sibling;
                    break;
                }
                sibling = sibling.previousSibling;
            }
        }

        logWarn('Restoring node position', node, prevSibling, parent);
        parent!.insertBefore(node, prevSibling && prevSibling.isConnected ? prevSibling.nextSibling : parent!.firstChild);
        observer.takeRecords();
        onRestore && onRestore();
    });
    const observer = new MutationObserver(() => {
        if (
            (mode === 'head' && (node.parentNode !== parent || !node.parentNode!.isConnected)) ||
            (mode === 'prev-sibling' && node.previousSibling !== prevSibling)
        ) {
            restore();
        }
    });
    const run = () => {
        if (parent) {
            observer.observe(parent, {childList: true});
        }
    };

    const stop = () => {
        if (timeoutId) {
            clearTimeout(timeoutId);
            timeoutId = undefined;
        }
        observer.disconnect();
        restore.cancel();
    };

    const skip = () => {
        observer.takeRecords();
    };

    const updateParent = (parentNode: Node & ParentNode | null) => {
        parent = parentNode;
        stop();
        run();
    };

    run();
    return {run, stop, skip};
}

export function iterateShadowHosts(root: Node | null, iterator: (host: Element) => void): void {
    if (root == null) {
        return;
    }
    const walker = document.createTreeWalker(
        root,
        NodeFilter.SHOW_ELEMENT,
        {
            acceptNode(node) {
                return (node as Element).shadowRoot == null ? NodeFilter.FILTER_SKIP : NodeFilter.FILTER_ACCEPT;
            },
        },
    );
    for (
        let node = ((root as Element).shadowRoot ? walker.currentNode : walker.nextNode()) as Element;
        node != null;
        node = walker.nextNode() as Element
    ) {
        if (node.classList.contains('surfingkeys_hints_host')) {
            continue;
        }

        iterator(node);
        iterateShadowHosts(node.shadowRoot, iterator);
    }
}

export let isDOMReady: () => boolean = () => {
    return document.readyState === 'complete' || document.readyState === 'interactive';
};

export function setIsDOMReady(newFunc: () => boolean): void {
    isDOMReady = newFunc;
}

const readyStateListeners = new Set<() => void>();

export function addDOMReadyListener(listener: () => void): void {
    isDOMReady() ? listener() : readyStateListeners.add(listener);
}

export function removeDOMReadyListener(listener: () => void): void {
    readyStateListeners.delete(listener);
}

// `interactive` can and will be fired when their are still stylesheets loading.
// We use certain actions that can cause a forced layout change, which is bad.
export function isReadyStateComplete(): boolean {
    return document.readyState === 'complete';
}

const readyStateCompleteListeners = new Set<() => void>();

export function addReadyStateCompleteListener(listener: () => void): void {
    isReadyStateComplete() ? listener() : readyStateCompleteListeners.add(listener);
}

export function cleanReadyStateCompleteListeners(): void {
    readyStateCompleteListeners.clear();
}

if (!isDOMReady()) {
    const onReadyStateChange = () => {
        if (isDOMReady()) {
            readyStateListeners.forEach((listener) => listener());
            readyStateListeners.clear();
            if (isReadyStateComplete()) {
                document.removeEventListener('readystatechange', onReadyStateChange);
                readyStateCompleteListeners.forEach((listener) => listener());
                readyStateCompleteListeners.clear();
            }
        }
    };

    // readystatechange event is not cancellable and does not bubble
    document.addEventListener('readystatechange', onReadyStateChange);
}

const HUGE_MUTATIONS_COUNT = 1000;

function isHugeMutation(mutations: MutationRecord[]) {
    if (mutations.length > HUGE_MUTATIONS_COUNT) {
        return true;
    }

    let addedNodesCount = 0;
    for (let i = 0; i < mutations.length; i++) {
        addedNodesCount += mutations[i].addedNodes.length;
        if (addedNodesCount > HUGE_MUTATIONS_COUNT) {
            return true;
        }
    }

    return false;
}

export interface ElementsTreeOperations {
    additions: Set<Element>;
    moves: Set<Element>;
    deletions: Set<Element>;
}

function getElementsTreeOperations(mutations: MutationRecord[]): ElementsTreeOperations {
    const additions = new Set<Element>();
    const deletions = new Set<Element>();
    const moves = new Set<Element>();
    mutations.forEach((m) => {
        forEach(m.addedNodes, (n) => {
            if (n instanceof Element && n.isConnected) {
                additions.add(n);
            }
        });
        forEach(m.removedNodes, (n) => {
            if (n instanceof Element) {
                if (n.isConnected) {
                    moves.add(n);
                    additions.delete(n);
                } else {
                    deletions.add(n);
                }
            }
        });
    });

    const duplicateAdditions: Element[] = [];
    const duplicateDeletions: Element[] = [];
    additions.forEach((node) => {
        if (additions.has(node.parentElement as HTMLElement)) {
            duplicateAdditions.push(node);
        }
    });
    deletions.forEach((node) => {
        if (deletions.has(node.parentElement as HTMLElement)) {
            duplicateDeletions.push(node);
        }
    });
    duplicateAdditions.forEach((node) => additions.delete(node));
    duplicateDeletions.forEach((node) => deletions.delete(node));

    return {additions, moves, deletions};
}

export interface OptimizedTreeObserverCallbacks {
    onMinorMutations: (root: Document | ShadowRoot, operations: ElementsTreeOperations) => void;
    onHugeMutations: (root: Document | ShadowRoot) => void;
}

interface RootData {
    callbacks: Set<OptimizedTreeObserverCallbacks>;
    hadHugeMutationsBefore: boolean;
    subscribedForReadyState: boolean;
    domReadyListener?: () => void;
}

class SharedOptimizedTreeObserver {
    private observer: MutationObserver;
    private observers = new Map<Node, RootData>();

    constructor() {
        this.observer = new MutationObserver(this.onMutations);
    }

    private onMutations = (mutations: MutationRecord[]) => {
        const mutationsByRoot = new Map<Node, MutationRecord[]>();
        mutations.forEach((m) => {
            const root = m.target.getRootNode();
            if (this.observers.has(root)) {
                if (!mutationsByRoot.has(root)) {
                    mutationsByRoot.set(root, []);
                }
                mutationsByRoot.get(root)!.push(m);
            }
        });

        mutationsByRoot.forEach((records, root) => {
            const data = this.observers.get(root);
            if (!data) {
                return;
            }
            const {callbacks} = data;

            if (isHugeMutation(records)) {
                if (!data.hadHugeMutationsBefore || isDOMReady()) {
                    callbacks.forEach(({onHugeMutations}) => onHugeMutations(root as Document | ShadowRoot));
                } else if (!data.subscribedForReadyState) {
                    data.domReadyListener = () => {
                        callbacks.forEach(({onHugeMutations}) => onHugeMutations(root as Document | ShadowRoot));
                    };
                    addDOMReadyListener(data.domReadyListener);
                    data.subscribedForReadyState = true;
                }
                data.hadHugeMutationsBefore = true;
            } else {
                const elementsOperations = getElementsTreeOperations(records);
                callbacks.forEach(({onMinorMutations}) => onMinorMutations(root as Document | ShadowRoot, elementsOperations));
            }
        });
    };

    public observe(root: Document | ShadowRoot, callbacks: OptimizedTreeObserverCallbacks) {
        if (!this.observers.has(root)) {
            this.observer.observe(root, {childList: true, subtree: true});
            this.observers.set(root, {
                callbacks: new Set(),
                hadHugeMutationsBefore: false,
                subscribedForReadyState: false,
            });
        }
        const data = this.observers.get(root)!;
        data.callbacks.add(callbacks);

        return {
            disconnect: () => {
                data.callbacks.delete(callbacks);
                if (data.callbacks.size === 0) {
                    this.disconnectRoot(root);
                }
            },
        };
    }

    private disconnectRoot(root: Node) {
        const data = this.observers.get(root);
        if (data && data.domReadyListener) {
            removeDOMReadyListener(data.domReadyListener);
        }

        const records = this.observer.takeRecords();
        this.observer.disconnect();
        this.observers.delete(root);

        if (records.length > 0) {
            this.onMutations(records);
        }

        this.observers.forEach((_, r) => {
            this.observer.observe(r, {childList: true, subtree: true});
        });
    }
}

const sharedObserver = new SharedOptimizedTreeObserver();

export function createOptimizedTreeObserver(root: Document | ShadowRoot, callbacks: OptimizedTreeObserverCallbacks): {disconnect: () => void} {
    return sharedObserver.observe(root, callbacks);
}

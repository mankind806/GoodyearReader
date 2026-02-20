import {createOptimizedTreeObserver, setIsDOMReady} from '../../../src/inject/utils/dom';
import type {ElementsTreeOperations} from '../../../src/inject/utils/dom';

describe('OptimizedTreeObserver', () => {
    let container: HTMLElement;
    let observer: {disconnect: () => void};

    beforeEach(() => {
        container = document.createElement('div');
        document.body.appendChild(container);
        setIsDOMReady(() => true);
    });

    afterEach(() => {
        if (observer) {
            observer.disconnect();
            observer = null as any;
        }
        if (container) {
            container.remove();
            container = null as any;
        }
    });

    it('should observe minor mutations on a single root', async () => {
        const onMinorMutations = jasmine.createSpy('onMinorMutations');
        const onHugeMutations = jasmine.createSpy('onHugeMutations');

        observer = createOptimizedTreeObserver(document, {onMinorMutations, onHugeMutations});

        const el = document.createElement('div');
        container.appendChild(el);

        await new Promise((resolve) => requestAnimationFrame(resolve));
        await new Promise((resolve) => setTimeout(resolve, 50));

        expect(onMinorMutations).toHaveBeenCalled();
        const args = onMinorMutations.calls.mostRecent().args;
        expect(args[0]).toBe(document);
        expect((args[1] as ElementsTreeOperations).additions.has(el)).toBeTrue();
    });

    it('should observe multiple roots independently', async () => {
        const shadowHost = document.createElement('div');
        container.appendChild(shadowHost);
        const shadowRoot = shadowHost.attachShadow({mode: 'open'});

        const onMinorMutationsDoc = jasmine.createSpy('onMinorMutationsDoc');
        const onMinorMutationsShadow = jasmine.createSpy('onMinorMutationsShadow');

        const observerDoc = createOptimizedTreeObserver(document, {
            onMinorMutations: onMinorMutationsDoc,
            onHugeMutations: () => {},
        });
        const observerShadow = createOptimizedTreeObserver(shadowRoot, {
            onMinorMutations: onMinorMutationsShadow,
            onHugeMutations: () => {},
        });

        // Mutate document
        const elDoc = document.createElement('span');
        container.appendChild(elDoc);

        // Mutate shadow root
        const elShadow = document.createElement('span');
        shadowRoot.appendChild(elShadow);

        await new Promise((resolve) => setTimeout(resolve, 50));

        expect(onMinorMutationsDoc).toHaveBeenCalled();
        expect(onMinorMutationsShadow).toHaveBeenCalled();

        const argsDoc = onMinorMutationsDoc.calls.mostRecent().args;
        expect(argsDoc[0]).toBe(document);
        expect((argsDoc[1] as ElementsTreeOperations).additions.has(elDoc)).toBeTrue();

        const argsShadow = onMinorMutationsShadow.calls.mostRecent().args;
        expect(argsShadow[0]).toBe(shadowRoot);
        expect((argsShadow[1] as ElementsTreeOperations).additions.has(elShadow)).toBeTrue();

        observerDoc.disconnect();
        observerShadow.disconnect();
    });

    it('should stop observing disconnected root', async () => {
        const onMinorMutations = jasmine.createSpy('onMinorMutations');
        observer = createOptimizedTreeObserver(document, {
            onMinorMutations,
            onHugeMutations: () => {},
        });

        observer.disconnect();
        observer = null as any;

        const el = document.createElement('div');
        container.appendChild(el);

        await new Promise((resolve) => setTimeout(resolve, 50));

        expect(onMinorMutations).not.toHaveBeenCalled();
    });

    it('should handle huge mutations correctly', async () => {
        // Simulate huge mutation by adding many nodes
        const onHugeMutations = jasmine.createSpy('onHugeMutations');
        observer = createOptimizedTreeObserver(document, {
            onMinorMutations: () => {},
            onHugeMutations,
        });

        const fragment = document.createDocumentFragment();
        // HUGE_MUTATIONS_COUNT is 1000. So we need 1001 nodes.
        for (let i = 0; i < 1100; i++) {
            fragment.appendChild(document.createElement('span'));
        }
        container.appendChild(fragment);

        await new Promise((resolve) => setTimeout(resolve, 50));

        expect(onHugeMutations).toHaveBeenCalled();
    });
});

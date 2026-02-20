/** @jest-environment jsdom */

import {watchForNodePosition} from '../../../../src/inject/utils/dom';

describe('watchForNodePosition', () => {
    let container: HTMLElement;
    let style1: HTMLStyleElement;
    let styleSync: HTMLStyleElement;
    let styleCors: HTMLStyleElement;
    let nodeToWatch: HTMLStyleElement;
    let watcher: {stop: () => void} | null = null;

    beforeEach(() => {
        // Use fake timers to control requestAnimationFrame/throttle
        jest.useFakeTimers();

        container = document.createElement('div');
        document.body.appendChild(container);
    });

    afterEach(() => {
        if (watcher) {
            watcher.stop();
        }
        container.remove();
        style1?.remove();
        styleSync?.remove();
        styleCors?.remove();
        nodeToWatch?.remove();
        jest.useRealTimers();
    });

    it('should restore node position in head after last valid .darkreader element', async () => {
        // Setup head structure with various .darkreader styles
        style1 = document.createElement('style');
        style1.classList.add('darkreader');
        style1.textContent = '/* 1 */';
        document.head.appendChild(style1);

        styleSync = document.createElement('style');
        styleSync.classList.add('darkreader');
        styleSync.classList.add('darkreader--sync');
        styleSync.textContent = '/* sync */';
        document.head.appendChild(styleSync);

        styleCors = document.createElement('style');
        styleCors.classList.add('darkreader');
        styleCors.classList.add('darkreader--cors');
        styleCors.textContent = '/* cors */';
        document.head.appendChild(styleCors);

        // Place the node to watch in a temporary container initially
        // This simulates the situation where the node was attached to a parent that gets disconnected
        nodeToWatch = document.createElement('style');
        nodeToWatch.classList.add('darkreader');
        nodeToWatch.classList.add('darkreader--test-watch');
        nodeToWatch.textContent = '/* watched */';
        container.appendChild(nodeToWatch);

        // Start watching
        // When we start watching, parent is 'container'.
        watcher = watchForNodePosition(nodeToWatch, 'head');

        // Now simulate the parent (container) being disconnected
        container.remove();

        // The watcher observes the parent for mutations.
        // But removing the parent itself doesn't trigger childList mutation on the parent.
        // However, watchForNodePosition checks `!parent.isConnected` inside `restore()`.
        // We need to trigger `restore()`.
        // Moving the node OUT of the parent triggers mutation on the parent (childList).
        // Or adding something to the parent triggers mutation on the parent.

        // Since the parent is disconnected, modifying it might still trigger the observer callback if the observer is still alive.
        // Let's modify the disconnected parent to trigger the observer.
        container.appendChild(document.createElement('div'));

        // Wait for microtasks (MutationObserver callbacks)
        await Promise.resolve();

        // Advance timers to trigger throttle callback (if pending)
        jest.runAllTimers();

        // Check that nodeToWatch is now in document.head
        expect(nodeToWatch.parentNode).toBe(document.head);

        // Check position: should be after style1 (last valid .darkreader), so before styleSync
        expect(nodeToWatch.previousElementSibling).toBe(style1);
        expect(nodeToWatch.nextElementSibling).toBe(styleSync);
    });
});

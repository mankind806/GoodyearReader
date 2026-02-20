/**
 * @jest-environment jsdom
 */

// Mock chrome
global.chrome = {
    runtime: {
        onMessage: {
            addListener: jest.fn(),
        },
    },
} as any;

import {manageStyle} from '../../../src/inject/dynamic-theme/style-manager';

describe('Style Manager', () => {
    let style: HTMLStyleElement;
    let update: jest.Mock;
    let loadingStart: jest.Mock;
    let loadingEnd: jest.Mock;

    beforeEach(() => {
        style = document.createElement('style');
        document.head.appendChild(style);
        update = jest.fn();
        loadingStart = jest.fn();
        loadingEnd = jest.fn();
    });

    afterEach(() => {
        style.remove();
        jest.clearAllMocks();
    });

    it('should throttle updates on rapid mutations', async () => {
        const manager = manageStyle(style, {update, loadingStart, loadingEnd});
        manager.watch();

        // Simulate rapid mutations
        for (let i = 0; i < 100; i++) {
            style.textContent = `.cls${i} { color: red; }`;
            // Wait for microtasks to ensure MutationObserver picks up changes
            await Promise.resolve();
        }

        // Wait for any pending updates (MutationObserver is async)
        await new Promise((resolve) => setTimeout(resolve, 100));

        // Without throttling, we expect update to be called many times.
        // With throttling, it should be significantly less.
        expect(update.mock.calls.length).toBeLessThan(10);

        manager.pause();
    });
});

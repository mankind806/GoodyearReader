/** @jest-environment jsdom */

import {m} from 'malevic';
// @ts-expect-error No type declaration for malevic/umd/dom
import {sync} from 'malevic/umd/dom';
import ShortcutLink from '../../../../src/ui/controls/shortcut';

// Mock platform utils
jest.mock('../../../../src/utils/platform', () => ({
    ...jest.requireActual('../../../../src/utils/platform'),
    isFirefox: true,
}));

describe('ShortcutLink', () => {
    let container: HTMLElement;
    let onSetShortcut: jest.Mock;

    beforeEach(() => {
        container = document.createElement('div');
        document.body.appendChild(container);
        onSetShortcut = jest.fn().mockResolvedValue('Ctrl+A');
    });

    afterEach(() => {
        document.body.removeChild(container);
        jest.clearAllMocks();
    });

    function render(props: any = {}) {
        sync(container, (
            <div>
                <ShortcutLink
                    commandName="test"
                    shortcuts={{test: 'Alt+B'}}
                    textTemplate={(s: any) => s || 'None'}
                    onSetShortcut={onSetShortcut}
                    {...props}
                />
            </div>
        ));
        return container.querySelector('a') as HTMLAnchorElement;
    }

    test('should set shortcut using e.code when e.key is strange but valid', () => {
        const link = render();
        link.click(); // Start editing

        // Press Ctrl
        window.dispatchEvent(new KeyboardEvent('keydown', {
            key: 'Control',
            code: 'ControlLeft',
            ctrlKey: true,
            bubbles: true,
        }));

        // Press 'A' key which produces 'ф' but has keyCode != 0
        window.dispatchEvent(new KeyboardEvent('keydown', {
            key: 'ф',
            code: 'KeyA',
            ctrlKey: true,
            keyCode: 65, // Standard keyCode for 'A'
            bubbles: true,
        }));

        expect(onSetShortcut).toHaveBeenCalledWith('Ctrl+A');
    });

    test('should NOT set shortcut when e.keyCode is 0 (unidentified key)', () => {
        const link = render();
        link.click(); // Start editing

        // Press Ctrl
        window.dispatchEvent(new KeyboardEvent('keydown', {
            key: 'Control',
            code: 'ControlLeft',
            ctrlKey: true,
            bubbles: true,
        }));

        // Press 'A' key which is Unidentified/keyCode=0
        window.dispatchEvent(new KeyboardEvent('keydown', {
            key: 'Unidentified',
            code: 'KeyA',
            ctrlKey: true,
            keyCode: 0,
            bubbles: true,
        }));

        expect(onSetShortcut).not.toHaveBeenCalled();
    });
});

/**
 * @jest-environment jsdom
 */

import {m} from 'malevic';
import {sync} from 'malevic/dom';
import {Portal, PortalTarget} from '../../../src/ui/popup/components/portal';

describe('Portal', () => {
    it('should render content into the target', () => {
        const targetName = 'test-target';

        // Render PortalTarget
        const targetNode = PortalTarget({name: targetName});
        if (!targetNode) {
            throw new Error('Target node not created');
        }
        document.body.appendChild(targetNode);

        // Render Portal
        const container = document.createElement('div');
        document.body.appendChild(container);

        function App() {
            return m(Portal, {target: targetName}, m('span', {class: 'content'}, 'Hello'));
        }

        sync(container, m(App, {}));

        // Check if content is in targetNode
        expect(targetNode.querySelector('.content')).toBeTruthy();
        expect(targetNode.textContent).toBe('Hello');

        // Cleanup
        document.body.removeChild(targetNode);
        document.body.removeChild(container);
    });
});

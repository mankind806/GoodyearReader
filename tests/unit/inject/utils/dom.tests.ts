/**
 * @jest-environment jsdom
 */

import {removeNode} from '../../../../src/inject/utils/dom';

describe('removeNode', () => {
    it('should remove an element from its parent', () => {
        const parent = document.createElement('div');
        const child = document.createElement('span');
        parent.appendChild(child);
        expect(child.parentNode).toBe(parent);
        removeNode(child);
        expect(child.parentNode).toBeNull();
    });

    it('should do nothing if node is null', () => {
        expect(() => removeNode(null)).not.toThrow();
    });

    it('should do nothing if node has no parent', () => {
        const node = document.createElement('div');
        expect(node.parentNode).toBeNull();
        expect(() => removeNode(node)).not.toThrow();
        expect(node.parentNode).toBeNull();
    });

    it('should remove a text node', () => {
        const parent = document.createElement('div');
        const text = document.createTextNode('Hello');
        parent.appendChild(text);
        expect(text.parentNode).toBe(parent);
        removeNode(text);
        expect(text.parentNode).toBeNull();
    });
});

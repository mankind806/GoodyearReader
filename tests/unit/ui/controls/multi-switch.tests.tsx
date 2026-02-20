/** @jest-environment jsdom */

import {m} from 'malevic';
// @ts-ignore
import {render} from 'malevic/dom';
import MultiSwitch from '../../../../src/ui/controls/multi-switch/index';

describe('MultiSwitch', () => {
    let container: HTMLElement;

    beforeEach(() => {
        container = document.createElement('div');
        document.body.appendChild(container);
    });

    afterEach(() => {
        if (container && container.parentNode) {
            container.parentNode.removeChild(container);
        }
    });

    test('should render string options correctly', () => {
        const options = ['A', 'B', 'C'];
        const onChange = jest.fn();

        render(container, (
            <MultiSwitch
                options={options}
                value="B"
                onChange={onChange}
            />
        ));

        const elements = container.querySelectorAll('.multi-switch__option');
        expect(elements.length).toBe(3);
        expect(elements[0].textContent).toBe('A');
        expect(elements[1].textContent).toBe('B');
        // Check selected state
        const selected = container.querySelector('.multi-switch__option--selected');
        expect(selected).not.toBeNull();
        expect(selected!.textContent).toBe('B');
    });

    test('should invoke onChange for string options', () => {
        const options = ['A', 'B'];
        const onChange = jest.fn();

        render(container, (
            <MultiSwitch
                options={options}
                value="B"
                onChange={onChange}
            />
        ));

        const elements = container.querySelectorAll('.multi-switch__option');
        (elements[0] as HTMLElement).click();
        expect(onChange).toHaveBeenCalledWith('A');
    });

    test('should render object options correctly', () => {
        const options = [
            {value: 'a', content: 'Option A'},
            {value: 'b', content: <span>Option B</span>},
        ];
        const onChange = jest.fn();

        render(container, (
            <MultiSwitch
                options={options}
                value="b"
                onChange={onChange}
            />
        ));

        const elements = container.querySelectorAll('.multi-switch__option');
        expect(elements.length).toBe(2);
        expect(elements[0].textContent).toBe('Option A');
        expect(elements[1].textContent).toBe('Option B');

        const selected = container.querySelector('.multi-switch__option--selected');
        expect(selected).not.toBeNull();
        expect(selected!.textContent).toBe('Option B');
    });

    test('should invoke onChange with value for object options', () => {
        const options = [
            {value: 'a', content: 'Option A'},
            {value: 'b', content: 'Option B'},
        ];
        const onChange = jest.fn();

        render(container, (
            <MultiSwitch
                options={options}
                value="b"
                onChange={onChange}
            />
        ));

        const elements = container.querySelectorAll('.multi-switch__option');
        // Click on Option A
        (elements[0] as HTMLElement).click();
        expect(onChange).toHaveBeenCalledWith('a');
    });
});

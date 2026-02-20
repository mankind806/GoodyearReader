import {m} from 'malevic';
import MultiSwitch from '../../../../src/ui/controls/multi-switch';

describe('MultiSwitch', () => {
    test('renders string options correctly', () => {
        const onChange = jest.fn();
        const props = {
            options: ['A', 'B'],
            value: 'A',
            onChange: onChange,
        };
        const result = MultiSwitch(props) as any;

        // Structure: span.multi-switch
        expect(result.type).toBe('span');
        expect(result.props.class).toContain('multi-switch');

        const children = result.children;
        // children[0] is highlight
        // children[1] is array of options (from map)

        const optionsMap = children[1] as any[];
        expect(Array.isArray(optionsMap)).toBe(true);
        expect(optionsMap.length).toBe(2);

        const optionA = optionsMap[0];
        const optionB = optionsMap[1];

        expect(optionA.children[0]).toBe('A');
        expect(optionB.children[0]).toBe('B');

        // Check selected class
        expect(optionA.props.class['multi-switch__option--selected']).toBe(true);
        expect(optionB.props.class['multi-switch__option--selected']).toBe(false);

        // Check click handler
        // optionB.props.onclick() should call onChange('B')
        optionB.props.onclick();
        expect(onChange).toHaveBeenCalledWith('B');

        // optionA.props.onclick() should NOT call onChange (already selected)
        optionA.props.onclick();
        expect(onChange).toHaveBeenCalledTimes(1);
    });

    test('renders object options correctly', () => {
        const onChange = jest.fn();
        const optionsData = [
            {value: 'valA', content: 'Content A'},
            {value: 'valB', content: 'Content B'},
        ];
        const props = {
            options: optionsData,
            value: 'valA',
            onChange: onChange,
        };
        const result = MultiSwitch(props) as any;

        const children = result.children;
        const optionsMap = children[1] as any[];
        expect(optionsMap.length).toBe(2);

        const optionA = optionsMap[0];
        const optionB = optionsMap[1];

        expect(optionA.children[0]).toBe('Content A');
        expect(optionB.children[0]).toBe('Content B');

        // Check selected class
        expect(optionA.props.class['multi-switch__option--selected']).toBe(true);

        // Check click handler
        // optionB is valB. Click should call onChange('valB')
        optionB.props.onclick();
        expect(onChange).toHaveBeenCalledWith('valB');
    });
});

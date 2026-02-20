import {m} from 'malevic';
import MultiSwitch from '../../../../src/ui/controls/multi-switch/index';

describe('MultiSwitch', () => {
    it('renders correctly with string options', () => {
        const options = ['OptionA', 'OptionB'];
        const vnode: any = MultiSwitch({options, value: 'OptionA', onChange: () => {}});
        expect(vnode).toBeDefined();

        const json = JSON.stringify(vnode);
        // Expect content to be present
        expect(json).toContain('OptionA');
        expect(json).toContain('OptionB');
    });

    it('renders correctly with object options', () => {
        const options = [{value: 'a', content: 'ContentA'}, {value: 'b', content: 'ContentB'}];
        const vnode: any = MultiSwitch({options, value: 'a', onChange: () => {}});
        expect(vnode).toBeDefined();

        const json = JSON.stringify(vnode);
        // Expect content to be present
        expect(json).toContain('ContentA');
        expect(json).toContain('ContentB');

        // Also check that 'value' is not rendered as text if possible, but values are usually not rendered.
        // But 'value' here is 'a' and 'b'. They might be in attrs or handlers which are not stringified nicely sometimes, or just hidden.
    });
});

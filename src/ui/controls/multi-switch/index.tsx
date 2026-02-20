import {m} from 'malevic';

interface MultiSwitchOption {
    value: string;
    content: Malevic.Child;
}

interface MultiSwitchProps {
    class?: string;
    options: Array<string | MultiSwitchOption>;
    value: string;
    onChange: (value: string) => void;
}

export default function MultiSwitch(props: MultiSwitchProps, ...children: Malevic.Child[]) {
    const values = props.options.map((option) => (typeof option === 'string' ? option : option.value));
    const index = values.indexOf(props.value);

    return (
        <span class={['multi-switch', props.class]}>
            <span
                class="multi-switch__highlight"
                style={{
                    'left': `${index / props.options.length * 100}%`,
                    'width': `${1 / props.options.length * 100}%`,
                }}
            />
            {props.options.map((option) => {
                const value = typeof option === 'string' ? option : option.value;
                const content = typeof option === 'string' ? option : option.content;
                return (
                    <span
                        class={{
                            'multi-switch__option': true,
                            'multi-switch__option--selected': value === props.value,
                        }}
                        onclick={() => value !== props.value && props.onChange(value)}
                    >
                        {content}
                    </span>
                );
            })}
            {...children}
        </span>
    );
}

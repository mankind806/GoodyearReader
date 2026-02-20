import {m} from 'malevic';

interface MultiSwitchOption {
    value: string;
    content: Malevic.Child;
}

interface MultiSwitchProps {
    class?: string;
    options: (string | MultiSwitchOption)[];
    value: string;
    onChange: (value: string) => void;
}

function isOptionObject(option: string | MultiSwitchOption): option is MultiSwitchOption {
    return typeof option === 'object' && option !== null && 'value' in option;
}

export default function MultiSwitch(props: MultiSwitchProps, ...children: Malevic.Child[]) {
    const values = props.options.map((option) => isOptionObject(option) ? option.value : option);

    return (
        <span class={['multi-switch', props.class]}>
            <span
                class="multi-switch__highlight"
                style={{
                    'left': `${values.indexOf(props.value) / props.options.length * 100}%`,
                    'width': `${1 / props.options.length * 100}%`,
                }}
            />
            {props.options.map((option) => {
                const value = isOptionObject(option) ? option.value : (option as string);
                const content = isOptionObject(option) ? option.content : (option as string);
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

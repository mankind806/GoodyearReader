import {m} from 'malevic';

type MultiSwitchOption<T> = T | {value: T; content: Malevic.Child};

interface MultiSwitchProps<T> {
    class?: string;
    options: Array<MultiSwitchOption<T>>;
    value: T;
    onChange: (value: T) => void;
}

function isOptionObject<T>(option: MultiSwitchOption<T>): option is {value: T; content: Malevic.Child} {
    return typeof option === 'object' && option != null && 'value' in option && 'content' in option;
}

export default function MultiSwitch<T = string>(props: MultiSwitchProps<T>, ...children: Malevic.Child[]) {
    return (
        <span class={['multi-switch', props.class]}>
            <span
                class="multi-switch__highlight"
                style={{
                    'left': `${props.options.findIndex((option) => (isOptionObject(option) ? option.value : option) === props.value) / props.options.length * 100}%`,
                    'width': `${1 / props.options.length * 100}%`,
                }}
            />
            {props.options.map((option) => {
                const value = isOptionObject(option) ? option.value : option as T;
                const content = isOptionObject(option) ? option.content : option as unknown as Malevic.Child;
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

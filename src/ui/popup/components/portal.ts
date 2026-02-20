import {getContext, render} from 'malevic/dom';

const targets = new Map<string, HTMLElement>();

interface PortalTargetProps {
    name: string;
}

export function PortalTarget(props: PortalTargetProps) {
    if (!targets.has(props.name)) {
        const node = document.createElement('div');
        node.classList.add('portal');
        targets.set(props.name, node);
    }
    return targets.get(props.name);
}

interface PortalProps {
    target: string;
}

export default function Portal(props: PortalProps, ...content: Malevic.Child[]) {
    const context = getContext();
    context.onRender(() => {
        const node = targets.get(props.target);
        if (node) {
            render(node, content);
        }
    });
    context.onRemove(() => {
        const node = targets.get(props.target);
        if (node) {
            render(node, null);
        }
    });

    return context.leave();
}

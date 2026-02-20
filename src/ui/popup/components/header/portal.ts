import {getContext, render} from 'malevic/dom';

let portalNode: HTMLElement | null = null;

function getPortalNode() {
    if (!portalNode) {
        portalNode = document.createElement('div');
        portalNode.classList.add('header__more-toggle-settings-portal');
        document.body.appendChild(portalNode);
    }
    return portalNode;
}

export default function Portal(props: {}, ...content: Malevic.Child[]) {
    const context = getContext();
    context.onRender(() => {
        const node = getPortalNode();
        render(node, content);
    });
    context.onRemove(() => {
        const node = getPortalNode();
        render(node, null);
    });
    return context.leave();
}

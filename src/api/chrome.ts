import type {MessageBGtoCS, MessageCStoBG} from '../definitions';
import {MessageTypeCStoBG, MessageTypeBGtoCS} from '../utils/message';
import {readResponseAsDataURL} from '../utils/network';

import {callFetchMethod} from './fetch';

if (!window.chrome) {
    window.chrome = {} as any;
}
if (!chrome.runtime) {
    chrome.runtime = {} as any;
}

const messageListeners = new Set<(message: MessageBGtoCS) => void>();

interface FetchRequestData {
    url: string;
    responseType: 'data-url' | 'text';
}

async function sendMessage(...args: unknown[]) {
    const arg0 = args[0];
    if (arg0 && typeof arg0 === 'object' && 'type' in arg0 && (arg0 as MessageCStoBG).type === MessageTypeCStoBG.FETCH) {
        const message = arg0 as MessageCStoBG;
        const {id} = message;
        try {
            const {url, responseType} = message.data as FetchRequestData;
            const response = await callFetchMethod(url);
            let text: string;
            if (responseType === 'data-url') {
                text = await readResponseAsDataURL(response);
            } else {
                text = await response.text();
            }
            messageListeners.forEach((cb) => cb({type: MessageTypeBGtoCS.FETCH_RESPONSE, data: text, error: null, id}));
        } catch (error) {
            console.error(error);
            messageListeners.forEach((cb) => cb({type: MessageTypeBGtoCS.FETCH_RESPONSE, data: null, error, id}));
        }
    }
}

function addMessageListener(callback: (data: any) => void) {
    messageListeners.add(callback);
}

if (typeof chrome.runtime.sendMessage === 'function') {
    const nativeSendMessage = chrome.runtime.sendMessage;
    (chrome.runtime.sendMessage as unknown) = (...args: any[]) => {
        sendMessage(...args);
        nativeSendMessage.apply(chrome.runtime, args);
    };
} else {
    chrome.runtime.sendMessage = sendMessage as any;
}

if (!chrome.runtime.onMessage) {
    (chrome.runtime as any).onMessage = {} as any;
}
if (typeof chrome.runtime.onMessage.addListener === 'function') {
    const nativeAddListener = chrome.runtime.onMessage.addListener;
    chrome.runtime.onMessage.addListener = (...args: any[]) => {
        addMessageListener(args[0]);
        nativeAddListener.apply(chrome.runtime.onMessage, args);
    };
} else {
    chrome.runtime.onMessage.addListener = (...args: any[]) => addMessageListener(args[0]);
}

import {getUILanguage} from './locales';
import {isEdge, isMobile} from './platform';

export const HOMEPAGE_URL = '';
export const BLOG_URL = '';
export const NEWS_URL = '';
export const DEVTOOLS_DOCS_URL = '';
export const DONATE_URL = '';
export const GITHUB_URL = '';
export const MOBILE_URL = '';
export const PRIVACY_URL = '';
export const TWITTER_URL = '';
export const UNINSTALL_URL = '';
export const HELP_URL = '';
export const CONFIG_URL_BASE = '';

const helpLocales = [
    'be',
    'cs',
    'de',
    'en',
    'es',
    'fr',
    'it',
    'ja',
    'nl',
    'pt',
    'ru',
    'sr',
    'tr',
    'zh-CN',
    'zh-TW',
];

export function getHelpURL(): string {
    if (isEdge && isMobile) {
        return `${HELP_URL}/mobile/`;
    }
    const locale = getUILanguage();
    const matchLocale = helpLocales.find((hl) => hl === locale) || helpLocales.find((hl) => locale.startsWith(hl)) || 'en';
    return `${HELP_URL}/${matchLocale}/`;
}

export function getBlogPostURL(postId: string): string {
    return `${BLOG_URL}${postId}/`;
}

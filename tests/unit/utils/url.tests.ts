import {indexURLTemplateList, isPDF, isURLInIndexedList, isURLMatched, isURLEnabled} from '../../../src/utils/url';
import type {UserSettings, TabInfo} from '../../../src/definitions';
import {AutomationMode} from '../../../src/utils/automation';

function createMockUserSettings(overrides: Partial<UserSettings> = {}): UserSettings {
    const defaults: UserSettings = {
        enabled: true,
        fetchNews: false,
        theme: {} as any,
        presets: [],
        customThemes: [],
        enabledByDefault: true,
        enabledFor: [],
        disabledFor: [],
        changeBrowserTheme: false,
        syncSettings: true,
        syncSitesFixes: false,
        automation: {
            enabled: false,
            mode: AutomationMode.SYSTEM,
            behavior: 'OnOff',
        },
        time: {
            activation: '18:00',
            deactivation: '9:00',
        },
        location: {
            latitude: null,
            longitude: null,
        },
        previewNewDesign: false,
        previewNewestDesign: false,
        enableForPDF: true,
        enableForProtectedPages: false,
        enableContextMenus: false,
        detectDarkTheme: false,
        schemeVersion: 2,
    };
    return {...defaults, ...overrides};
}

describe('Domain utilities', () => {
    test('URL match', () => {
        expect(isURLMatched('https://www.example.com/', '*')).toEqual(true);
        expect(isURLMatched('https://www.example.com/', '*.*')).toEqual(true);
        expect(isURLMatched('https://www.example.com/', '*.*.*')).toEqual(true);
        expect(isURLMatched('https://www.example.com/', '*.*.*.*')).toEqual(false);

        expect(isURLMatched('https://www.example.com/page/1', 'example.com')).toEqual(true);
        expect(isURLMatched('https://www.failure.com/page/1', 'example.com')).toEqual(false);
        expect(isURLMatched('https://xyz.example.com/page/1', 'example.com')).toEqual(false);
        expect(isURLMatched('https://xyz.www.example.com/page/1', 'example.com')).toEqual(false);

        expect(isURLMatched('https://xyz.example.com/page/1', '*.example.com')).toEqual(true);
        expect(isURLMatched('https://abc.xyz.example.com/page/1', '*.example.com')).toEqual(true);
        expect(isURLMatched('https://xyz.failure.com/page/1', '*.example.com')).toEqual(false);

        expect(isURLMatched('https://www.example.com/page/1', 'example.com/page')).toEqual(true);
        expect(isURLMatched('https://www.example.com/fail/1', 'example.com/page')).toEqual(false);

        expect(isURLMatched('https://example.com/page/1', '^example.com')).toEqual(true);
        expect(isURLMatched('https://www.example.com/page/1', '^example.com')).toEqual(false);

        expect(isURLMatched('https://www.example.com/', 'example.com$')).toEqual(true);
        expect(isURLMatched('https://www.example.com/page/1', 'example.com$')).toEqual(false);

        expect(isURLMatched('https://www.example.de/', 'example.*')).toEqual(true);
        expect(isURLMatched('https://www.failure.com/', 'example.*')).toEqual(false);

        expect(isURLMatched('https://www.example.co.uk/', 'example.*.*')).toEqual(true);
        expect(isURLMatched('https://www.example.com/', 'example.*.*')).toEqual(false);

        expect(isURLMatched('https://www.example.com/path/long/enough', 'example.com/path/*')).toEqual(true);
        expect(isURLMatched('https://www.failure.com/fail/long/enough', 'example.com/path/*')).toEqual(false);

        expect(isURLMatched('http://localhost:8080/', 'localhost:8080')).toEqual(true);
        expect(isURLMatched('http://localhost:1024/', 'localhost:8080')).toEqual(false);

        expect(isURLMatched('http://localhost:8080/', 'localhost:*')).toEqual(true);
        expect(isURLMatched('http://172.168.0.100:8080/', 'localhost:*')).toEqual(false);

        expect(isURLMatched('http://www.example.com/page/1', 'http://*')).toEqual(true);
        expect(isURLMatched('https://www.example.com/page/1', 'http://*')).toEqual(false);

        expect(isURLMatched('file:///C:/My%20Documents/balance.xlsx', 'file:///C:')).toEqual(true);
        expect(isURLMatched('file:///D:/Bin/cat.gif', 'file:///C:')).toEqual(false);

        expect(isURLMatched('https://www.example.com/page/1', '/www\.ex.*\.com/')).toEqual(true);
        expect(isURLMatched('https://www.failure.com/page/1', '/www\.ex.*\.com/')).toEqual(false);

        expect(isURLMatched('https://[2001:0DB8:AC10:FE01::200E]/', '[2001:0DB8:AC10:FE01::200E]')).toEqual(true);
        expect(isURLMatched('https://[2001:0DB8:AC10:FE02::200E]/', '[2001:0DB8:AC10:FE01::200E]')).toEqual(false);
        expect(isURLMatched('https://[2001:0DB8:AC10:FE01::200E]:8080/', '[2001:0DB8:AC10:FE01::200E]:8080')).toEqual(true);
        expect(isURLMatched('https://[2001:0DB8:AC10:FE02::200E]:1024/', '[2001:0DB8:AC10:FE01::200E]:8080')).toEqual(false);
    });

    test('URL is PDF', () => {
        expect(isPDF('https://www.google.com/file.pdf')).toBe(true);
        expect(isPDF('https://www.google.com/file.pdf?id=2')).toBe(true);
        expect(isPDF('https://www.google.com/file.pdf/resource')).toBe(false);
        expect(isPDF('https://www.google.com/resource?file=file.pdf')).toBe(false);
        expect(isPDF('https://www.google.com/very/good/hidden/folder/pdf#file.pdf')).toBe(false);
        expect(isPDF('https://fi.wikipedia.org/wiki/Tiedosto:ExtIPA_chart_(2015).pdf?uselang=en')).toBe(false);
        expect(isPDF('https://commons.wikimedia.org/wiki/File:ExtIPA_chart_(2015).pdf')).toBe(false);
        expect(isPDF('https://upload.wikimedia.org/wikipedia/commons/5/56/ExtIPA_chart_(2015).pdf')).toBe(true);
    });

    test('URL list index', () => {
        const simplePatterns = [
            'apple.com',
            'google.com',
        ];
        let indexed = indexURLTemplateList(simplePatterns);
        expect(isURLInIndexedList('https://apple.com/', indexed)).toEqual(true);
        expect(isURLInIndexedList('https://www.apple.com/', indexed)).toEqual(true);
        expect(isURLInIndexedList('https://google.com/', indexed)).toEqual(true);
        expect(isURLInIndexedList('https://www.google.com/', indexed)).toEqual(true);
        expect(isURLInIndexedList('https://www.google.co.uk/', indexed)).toEqual(false);
        expect(isURLInIndexedList('https://www.google.com/maps', indexed)).toEqual(true);
        expect(isURLInIndexedList('https://mail.google.com/', indexed)).toEqual(false);
        expect(isURLInIndexedList('https://www.example.com/', indexed)).toEqual(false);

        const wildcardPatterns = [
            'apple.com',
            'google.*',
            '*.example.com',
        ];
        indexed = indexURLTemplateList(wildcardPatterns);
        expect(isURLInIndexedList('https://apple.com/', indexed)).toEqual(true);
        expect(isURLInIndexedList('https://www.apple.com/', indexed)).toEqual(true);
        expect(isURLInIndexedList('https://google.com/', indexed)).toEqual(true);
        expect(isURLInIndexedList('https://www.google.com/', indexed)).toEqual(true);
        expect(isURLInIndexedList('https://www.google.co.uk/', indexed)).toEqual(false);
        expect(isURLInIndexedList('https://www.google.com/maps', indexed)).toEqual(true);
        expect(isURLInIndexedList('https://mail.google.com/', indexed)).toEqual(false);
        expect(isURLInIndexedList('https://example.com/', indexed)).toEqual(false);
        expect(isURLInIndexedList('https://www.example.com/', indexed)).toEqual(true);
        expect(isURLInIndexedList('https://test.example.com/', indexed)).toEqual(true);

        const pathPatterns = [
            'apple.com',
            'google.*/maps',
        ];
        indexed = indexURLTemplateList(pathPatterns);
        expect(isURLInIndexedList('https://apple.com/', indexed)).toEqual(true);
        expect(isURLInIndexedList('https://www.apple.com/', indexed)).toEqual(true);
        expect(isURLInIndexedList('https://google.com/', indexed)).toEqual(false);
        expect(isURLInIndexedList('https://www.google.com/', indexed)).toEqual(false);
        expect(isURLInIndexedList('https://www.google.co.uk/', indexed)).toEqual(false);
        expect(isURLInIndexedList('https://www.google.com/maps', indexed)).toEqual(true);
        expect(isURLInIndexedList('https://www.google.com/maps/edit', indexed)).toEqual(true);
        expect(isURLInIndexedList('https://www.google.co.uk/maps', indexed)).toEqual(false);
        expect(isURLInIndexedList('https://www.google.com/mail', indexed)).toEqual(false);
        expect(isURLInIndexedList('https://mail.google.com/', indexed)).toEqual(false);
        expect(isURLInIndexedList('https://www.example.com/', indexed)).toEqual(false);

        const mixedPatterns = [
            'apple.com',
            'google.*/maps',
            'google.*.*/maps',
            '*.example.com',
            'office.com/*/edit',
            'mail.google.*/mail',
        ];
        indexed = indexURLTemplateList(mixedPatterns);
        expect(isURLInIndexedList('https://apple.com/', indexed)).toEqual(true);
        expect(isURLInIndexedList('https://www.apple.com/', indexed)).toEqual(true);
        expect(isURLInIndexedList('https://google.com/', indexed)).toEqual(false);
        expect(isURLInIndexedList('https://www.google.com/', indexed)).toEqual(false);
        expect(isURLInIndexedList('https://www.google.co.uk/', indexed)).toEqual(false);
        expect(isURLInIndexedList('https://www.google.com/maps', indexed)).toEqual(true);
        expect(isURLInIndexedList('https://www.google.co.uk/maps', indexed)).toEqual(true);
        expect(isURLInIndexedList('https://www.google.com/maps/edit', indexed)).toEqual(true);
        expect(isURLInIndexedList('https://www.google.com/mail', indexed)).toEqual(false);
        expect(isURLInIndexedList('https://mail.google.com/', indexed)).toEqual(false);
        expect(isURLInIndexedList('https://mail.google.com/mail/u/0/', indexed)).toEqual(true);
        expect(isURLInIndexedList('https://example.com/', indexed)).toEqual(false);
        expect(isURLInIndexedList('https://www.example.com/', indexed)).toEqual(true);
        expect(isURLInIndexedList('https://test.example.com/', indexed)).toEqual(true);
        expect(isURLInIndexedList('https://long.test.example.com/', indexed)).toEqual(true);
        expect(isURLInIndexedList('https://www.office.com/excel/', indexed)).toEqual(false);
        expect(isURLInIndexedList('https://www.office.com/excel/edit', indexed)).toEqual(true);
        expect(isURLInIndexedList('https://www.office.com/excel/edit/2000', indexed)).toEqual(true);
    });

    describe('isURLEnabled', () => {
        test('Local Files', () => {
            const settings = createMockUserSettings();
            const tabInfo: Partial<TabInfo> = {};

            expect(isURLEnabled('file:///C:/test.html', settings, tabInfo, true)).toBe(true);
            expect(isURLEnabled('file:///C:/test.html', settings, tabInfo, false)).toBe(false);
            expect(isURLEnabled('https://google.com', settings, tabInfo, false)).toBe(true);
        });

        test('Protected Pages', () => {
            const settingsDefault = createMockUserSettings({enableForProtectedPages: false});
            const settingsProtected = createMockUserSettings({enableForProtectedPages: true});
            const tabInfoProtected: Partial<TabInfo> = {isProtected: true};
            const tabInfoNormal: Partial<TabInfo> = {isProtected: false};

            expect(isURLEnabled('https://chrome.google.com/webstore', settingsDefault, tabInfoProtected)).toBe(false);
            expect(isURLEnabled('https://chrome.google.com/webstore', settingsProtected, tabInfoProtected)).toBe(true);
            expect(isURLEnabled('https://google.com', settingsDefault, tabInfoNormal)).toBe(true);
        });

        test('PDF Files', () => {
            const settingsPDF = createMockUserSettings({enableForPDF: true});
            const settingsNoPDF = createMockUserSettings({enableForPDF: false});
            const tabInfo: Partial<TabInfo> = {};
            const pdfUrl = 'https://example.com/doc.pdf';

            expect(isURLEnabled(pdfUrl, settingsPDF, tabInfo)).toBe(true);
            expect(isURLEnabled(pdfUrl, settingsNoPDF, tabInfo)).toBe(false);
        });

        test('Enabled/Disabled Lists (Standard Mode)', () => {
            const settings = createMockUserSettings({
                enabledByDefault: true,
                disabledFor: ['google.com', 'example.com/mail'],
                enabledFor: ['mail.google.com'],
            });
            const tabInfo: Partial<TabInfo> = {};

            expect(isURLEnabled('https://yahoo.com', settings, tabInfo)).toBe(true);
            expect(isURLEnabled('https://google.com', settings, tabInfo)).toBe(false);
            expect(isURLEnabled('https://example.com/mail', settings, tabInfo)).toBe(false);
            expect(isURLEnabled('https://mail.google.com', settings, tabInfo)).toBe(true);
        });

        test('Enabled/Disabled Lists (Allowlist Mode)', () => {
            const settings = createMockUserSettings({
                enabledByDefault: false,
                enabledFor: ['google.com', '*.yahoo.com'],
                disabledFor: ['mail.google.com'],
            });
            const tabInfo: Partial<TabInfo> = {};

            expect(isURLEnabled('https://yahoo.com', settings, tabInfo)).toBe(false);
            expect(isURLEnabled('https://google.com', settings, tabInfo)).toBe(true);
            expect(isURLEnabled('https://mail.google.com', settings, tabInfo)).toBe(false);
            expect(isURLEnabled('https://bing.com', settings, tabInfo)).toBe(false);
            expect(isURLEnabled('https://mail.yahoo.com', settings, tabInfo)).toBe(true);
        });

        test('Dark Theme Detection', () => {
            const settings = createMockUserSettings({
                detectDarkTheme: true,
                enabledByDefault: true,
            });
            const settingsNoDetect = createMockUserSettings({
                detectDarkTheme: false,
                enabledByDefault: true,
            });

            expect(isURLEnabled('https://google.com', settings, {isInDarkList: true})).toBe(false);
            expect(isURLEnabled('https://google.com', settingsNoDetect, {isInDarkList: true})).toBe(false);
            expect(isURLEnabled('https://google.com', settings, {isDarkThemeDetected: true})).toBe(false);
            expect(isURLEnabled('https://google.com', settingsNoDetect, {isDarkThemeDetected: true})).toBe(true);
        });
    });
});

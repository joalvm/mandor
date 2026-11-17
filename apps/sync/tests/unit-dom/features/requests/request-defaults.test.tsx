import { MessagesProvider } from '@mandor/i18n';
import { DEFAULT_REQUEST_SETTINGS } from '@mandor/schema';
import { defaultsEditing, TooltipProvider } from '@mandor/ui';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { RequestDefaultsSection } from '../../../../src/renderer/features/requests/components/settings/RequestDefaultsSection.js';
import {
    readRequestDefaults,
    REQUEST_DEFAULTS_STORAGE_KEY,
    requestDefaultsStore,
} from '../../../../src/renderer/features/requests/request-defaults-store.js';

afterEach(() => {
    cleanup();
    window.localStorage.clear();
    requestDefaultsStore.setState({ defaults: DEFAULT_REQUEST_SETTINGS });
});

function keep(value: unknown): void {
    window.localStorage.setItem(REQUEST_DEFAULTS_STORAGE_KEY, JSON.stringify(value));
}

describe('the defaults of the requests as the app keeps them', () => {
    it('are the factory ones until something is kept', () => {
        expect(readRequestDefaults()).toEqual(DEFAULT_REQUEST_SETTINGS);
    });

    it('read what was kept over the factory, so a setting added later still has a value', () => {
        keep({ timeoutMs: 5000 });

        expect(readRequestDefaults()).toEqual({ ...DEFAULT_REQUEST_SETTINGS, timeoutMs: 5000 });
    });

    it('fall back to the factory when what was kept does not read', () => {
        keep({ timeoutMs: -1 });

        expect(readRequestDefaults()).toEqual(DEFAULT_REQUEST_SETTINGS);

        window.localStorage.setItem(REQUEST_DEFAULTS_STORAGE_KEY, '{not json');

        expect(readRequestDefaults()).toEqual(DEFAULT_REQUEST_SETTINGS);
    });

    it('are written where they are read the next time the app opens', () => {
        requestDefaultsStore
            .getState()
            .setDefaults({ ...DEFAULT_REQUEST_SETTINGS, maxRedirects: 2 });

        expect(readRequestDefaults().maxRedirects).toBe(2);
    });

    it('stay for this run when the storage refuses them', () => {
        vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
            throw new Error('full');
        });

        requestDefaultsStore
            .getState()
            .setDefaults({ ...DEFAULT_REQUEST_SETTINGS, maxRedirects: 2 });

        expect(requestDefaultsStore.getState().defaults.maxRedirects).toBe(2);

        vi.restoreAllMocks();
    });

    it('edit as values of their own, with nothing above them to follow', () => {
        const onDefaults = vi.fn();
        const editing = defaultsEditing(DEFAULT_REQUEST_SETTINGS, onDefaults);

        editing.change({ validateTls: false });

        expect(onDefaults).toHaveBeenCalledWith({
            ...DEFAULT_REQUEST_SETTINGS,
            validateTls: false,
        });
        expect(editing.inheritanceOf('validateTls')).toBeUndefined();
    });
});

// The section draws the rows a request draws — RequestSendingSettings, RequestRedirectSettings
// and RequestTlsSettings — over the defaults instead of over a request.
describe('the section of the defaults in the settings of the app', () => {
    it('writes a default the next send of every request that left it alone uses', () => {
        render(
            <MessagesProvider preferences={{ language: 'en' }}>
                <TooltipProvider>
                    <RequestDefaultsSection />
                </TooltipProvider>
            </MessagesProvider>,
        );

        expect(screen.queryByText('Default from')).toBeNull();

        fireEvent.click(screen.getByRole('switch', { name: 'Use the cookie jar' }));

        expect(requestDefaultsStore.getState().defaults.useCookieJar).toBe(false);
        expect(readRequestDefaults().useCookieJar).toBe(false);
    });
});

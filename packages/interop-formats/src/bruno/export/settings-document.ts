import { definedOnly, type FormatDocument } from '@mandor/interop-core';
import type { RequestSettingsOverrides } from '@mandor/schema';

/** The settings of a request that Bruno has too; a request that decides none writes no key. */
export function settingsDocumentOf(settings: RequestSettingsOverrides): FormatDocument {
    const kept = definedOnly({
        timeout: settings.timeoutMs,
        followRedirects: settings.followRedirects,
        maxRedirects: settings.maxRedirects,
        forwardAuthorizationHeader: settings.followAuthorizationOnRedirect,
    });

    return Object.keys(kept).length === 0 ? {} : { settings: kept };
}

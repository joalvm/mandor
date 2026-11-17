import type { FormatDocument } from '@mandor/interop-core';
import type { RequestSettingsOverrides } from '@mandor/schema';

function followOf(followRedirects: boolean | undefined): string {
    if (followRedirects === undefined) {
        return 'global';
    }

    return followRedirects ? 'on' : 'off';
}

/**
 * The switches of a request that Insomnia has too; a request that decides none writes no key.
 * Insomnia writes the whole object or none, so the switches Mandor does not hold say its default.
 */
export function requestSettingsDocumentOf(settings: RequestSettingsOverrides): FormatDocument {
    const { followRedirects, useCookieJar } = settings;

    if (followRedirects === undefined && useCookieJar === undefined) {
        return {};
    }

    const jar = useCookieJar !== false;

    return {
        settings: {
            renderRequestBody: true,
            encodeUrl: true,
            followRedirects: followOf(followRedirects),
            rebuildPath: true,
            cookies: { send: jar, store: jar },
        },
    };
}

import { describe, expect, it } from 'vitest';

import { downloadsOf } from '../../site/downloads.mjs';

const BASE = 'https://github.com/joalvm/mandor/releases/download';

function asset(tag, name) {
    return { name, size: 1024, browser_download_url: `${BASE}/${tag}/${name}` };
}

/** A release as the API lists it, with the files a release of the workflow holds. */
function release(tag, { draft = false, extra = [] } = {}) {
    const [app = '', version = ''] = tag.split('-v');
    const product = `Mandor-${app === 'request' ? 'Request' : 'Realtime'}-${version}`;
    const names = [
        `${product}-win-x64.exe`,
        `${product}-win-x64.exe.blockmap`,
        `${product}-win-arm64.exe`,
        `${product}-mac-arm64.dmg`,
        `${product}-mac-arm64.zip`,
        `${product}-mac-x64.dmg`,
        `${product}-linux-x86_64.AppImage`,
        `${product}-linux-arm64.AppImage`,
        `${product}-linux-amd64.deb`,
        `${product}-linux-arm64.deb`,
        'latest.yml',
        'SHA256SUMS',
        ...extra,
    ];

    return {
        tag_name: tag,
        draft,
        prerelease: tag.includes('-beta.'),
        html_url: `https://github.com/joalvm/mandor/releases/tag/${tag}`,
        assets: names.map((name) => asset(tag, name)),
    };
}

describe('the downloads of each app', () => {
    it('offer the newest release of each app, a beta when it is newer than every stable', () => {
        const { request, realtime } = downloadsOf([
            release('request-v0.1.0'),
            release('request-v0.2.0-beta.1'),
            release('request-v0.1.0-beta.2'),
            release('realtime-v0.1.0-beta.2'),
            release('realtime-v0.1.0'),
            release('realtime-v0.0.9'),
        ]);

        expect(request.version).toBe('0.2.0-beta.1');
        expect(realtime.version).toBe('0.1.0');
    });

    it('leave out drafts, the feeds of the updater and what is no release tag', () => {
        const { request, realtime } = downloadsOf([
            release('request-v0.2.0', { draft: true }),
            release('request-v0.1.0-beta.2'),
            { tag_name: 'request-feed', draft: false, prerelease: true, assets: [] },
            { tag_name: 'v9.9.9', draft: false, prerelease: false, assets: [] },
        ]);

        expect(request.version).toBe('0.1.0-beta.2');
        expect(realtime).toBeNull();
    });

    it('list one installer per system, architecture and kind, in the order of the table', () => {
        const { request } = downloadsOf([release('request-v0.1.0')]);

        expect(request.files.map(({ system, arch, kind }) => `${system} ${arch} ${kind}`)).toEqual([
            'windows x64 exe',
            'windows arm64 exe',
            'macos arm64 dmg',
            'macos x64 dmg',
            'linux x64 AppImage',
            'linux arm64 AppImage',
            'linux x64 deb',
            'linux arm64 deb',
        ]);
        expect(request.files[0]).toEqual({
            system: 'windows',
            arch: 'x64',
            kind: 'exe',
            name: 'Mandor-Request-0.1.0-win-x64.exe',
            size: 1024,
            url: `${BASE}/request-v0.1.0/Mandor-Request-0.1.0-win-x64.exe`,
        });
    });

    it('point at the checksums, the notices, the page and the source of that version', () => {
        const notices = 'Mandor-Realtime-0.2.0-THIRD-PARTY-NOTICES.txt';
        const { realtime } = downloadsOf([release('realtime-v0.2.0', { extra: [notices] })]);

        expect(realtime).toMatchObject({
            tag: 'realtime-v0.2.0',
            page: 'https://github.com/joalvm/mandor/releases/tag/realtime-v0.2.0',
            source: 'https://github.com/joalvm/mandor/tree/realtime-v0.2.0',
            sums: `${BASE}/realtime-v0.2.0/SHA256SUMS`,
            notices: `${BASE}/realtime-v0.2.0/${notices}`,
        });
    });

    it('have no notices to point at for a release made before they were attached', () => {
        expect(downloadsOf([release('request-v0.1.0')]).request.notices).toBeNull();
    });
});

import { describe, expect, it } from 'vitest';

import { downloadsMarkup } from '../../site/downloads-markup.mjs';

const WORDS = {
    systems: {
        windows: { name: 'Windows', note: '10 and 11' },
        macos: { name: 'macOS', note: '12 or later' },
        linux: { name: 'Linux', note: 'AppImage & deb' },
    },
    arch: {
        'windows-x64': 'x64',
        'windows-arm64': 'Arm64',
        'macos-arm64': 'Apple silicon',
        'macos-x64': 'Intel',
        'linux-x64': 'x64',
        'linux-arm64': 'Arm64',
    },
    kind: { exe: 'Installer', dmg: 'Disk image', AppImage: 'AppImage', deb: 'Debian package' },
    download: 'Download',
    sums: 'Checksums',
    notices: 'Third-party notices',
    source: 'Source',
    page: 'Release notes',
    none: 'Nothing released yet.',
    releases: 'Releases',
};

const CONTEXT = { words: WORDS, lang: 'en' };

function offer(tag, version, files) {
    return {
        version,
        tag,
        page: `https://github.com/joalvm/mandor/releases/tag/${tag}`,
        source: `https://github.com/joalvm/mandor/tree/${tag}`,
        sums: `https://example.test/${tag}/SHA256SUMS`,
        notices: null,
        files,
    };
}

const WINDOWS = {
    system: 'windows',
    arch: 'x64',
    kind: 'exe',
    name: 'Mandor-Request-0.1.0-win-x64.exe',
    size: 98_765_432,
    url: 'https://example.test/request-v0.1.0/Mandor-Request-0.1.0-win-x64.exe',
};

const LINUX = {
    ...WINDOWS,
    system: 'linux',
    kind: 'deb',
    name: 'Mandor-Request-0.1.0-linux-amd64.deb',
};

function panelOf(html, system) {
    return new RegExp(`<div class="panel" data-system="${system}">(.*?)</div></div>`, 'u').exec(
        html,
    )?.[1];
}

describe('the downloads of the page', () => {
    it('open on Windows, with a radio and a tab for each system', () => {
        const html = downloadsMarkup({ request: null, realtime: null }, CONTEXT);

        expect(html.match(/<input class="pick"/gu)).toHaveLength(3);
        expect(html).toContain('id="sys-windows" value="windows" checked>');
        expect(html).not.toContain('value="macos" checked');
        expect(html).toContain(
            '<label class="tab" for="sys-linux"><span class="tab-name">Linux</span>',
        );
        expect(html).toContain('<span class="tab-note">AppImage &amp; deb</span>');
    });

    it('show on each tab only the installers for that system, sized in megabytes', () => {
        const request = offer('request-v0.1.0', '0.1.0', [WINDOWS, LINUX]);
        const html = downloadsMarkup({ request, realtime: null }, CONTEXT);
        const windows = panelOf(html, 'windows');

        expect(windows).toContain(`<a class="band" href="${WINDOWS.url}">`);
        expect(windows).toContain(
            '<span class="band-title">Installer<span class="band-note">Mandor-Request-0.1.0-win-x64.exe · 98.8 MB</span></span>',
        );
        expect(windows).not.toContain('linux-amd64.deb');
        expect(panelOf(html, 'linux')).toContain(
            'Debian package<span class="band-note">Mandor-Request-0.1.0-linux-amd64.deb',
        );
    });

    it('head the installers of each app with its name and version, once', () => {
        const request = offer('request-v0.1.0', '0.1.0', [WINDOWS, LINUX]);
        const html = downloadsMarkup({ request, realtime: null }, CONTEXT);
        const windows = panelOf(html, 'windows');

        expect(windows).toContain(
            '<div class="group" data-app="request"><h4 class="group-title">Mandor Request 0.1.0</h4>',
        );
        expect(windows.match(/Mandor Request 0\.1\.0/gu)).toHaveLength(1);
        expect(windows).toContain('<h4 class="group-title">Mandor Realtime</h4>');
    });

    it('write the size the way the language of the page writes numbers', () => {
        const request = offer('request-v0.1.0', '0.1.0', [WINDOWS]);
        const html = downloadsMarkup({ request, realtime: null }, { ...CONTEXT, lang: 'es' });

        expect(html).toContain('98,8 MB');
    });

    it('lead an app with nothing released to where its releases will be', () => {
        const html = downloadsMarkup({ request: null, realtime: null }, CONTEXT);

        expect(html).toContain(
            'href="https://github.com/joalvm/mandor/releases?q=realtime-v&amp;expanded=true"',
        );
        expect(html).toContain(
            '<h4 class="group-title">Mandor Realtime</h4><ul class="bands"><li><a class="band" href="https://github.com/joalvm/mandor/releases?q=realtime-v&amp;expanded=true"><span class="band-arch"></span><span class="band-title">Nothing released yet.</span>',
        );
    });

    it('put the checksums, the source of the tag and the release next to the installers', () => {
        const request = offer('request-v0.1.0', '0.1.0', [WINDOWS]);
        const html = downloadsMarkup({ request, realtime: null }, CONTEXT);

        expect(html).toContain(
            '<a href="https://example.test/request-v0.1.0/SHA256SUMS">Checksums</a>',
        );
        expect(html).toContain(
            '<a href="https://github.com/joalvm/mandor/tree/request-v0.1.0">Source request-v0.1.0</a>',
        );
        expect(html).not.toContain('Third-party notices');
    });

    it('offer a beta like any release, named by its version', () => {
        const beta = offer('request-v0.2.0-beta.1', '0.2.0-beta.1', [
            { ...WINDOWS, name: 'Mandor-Request-0.2.0-beta.1-win-x64.exe' },
        ]);
        const html = downloadsMarkup({ request: beta, realtime: null }, CONTEXT);

        expect(html).toContain('<h4 class="group-title">Mandor Request 0.2.0-beta.1</h4>');
        expect(html).toContain('Mandor-Request-0.2.0-beta.1-win-x64.exe');
    });
});

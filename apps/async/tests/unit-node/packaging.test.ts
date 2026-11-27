import { access, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';

const APP_ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');

type Target = {
    target: string;
    arch?: string[];
};

type BuilderConfig = {
    appId: string;
    asar: boolean;
    electronFuses: Record<string, boolean>;
    executableName: string;
    extraResources: { from: string; to: string }[];
    files: string[];
    linux: { icon: string; maintainer: string; syncDesktopName: boolean; target: Target[] };
    generateUpdatesFilesForAllChannels: boolean;
    mac: { icon: string; identity: string; hardenedRuntime: boolean; target: Target[] };
    nsis: { buildUniversalInstaller: boolean; installerIcon: string; uninstallerIcon: string };
    productName: string;
    publish: { provider: string; url: string };
    win: { icon: string; target: Target[] };
};

async function config(): Promise<BuilderConfig> {
    const source = await readFile(join(APP_ROOT, 'electron-builder.yml'), 'utf8');

    return parse(source) as BuilderConfig;
}

async function manifest(): Promise<Record<string, unknown>> {
    return JSON.parse(await readFile(join(APP_ROOT, 'package.json'), 'utf8')) as Record<
        string,
        unknown
    >;
}

describe('Mandor Realtime packaging', () => {
    /** The name the user installs is the product's; the id stays the one an update replaces. */
    it('builds every supported installer and architecture', async () => {
        const value = await config();
        const metadata = JSON.parse(await readFile(join(APP_ROOT, 'package.json'), 'utf8')) as {
            desktopName?: string;
            homepage?: string;
        };

        expect(value.appId).toBe('com.mandor.async');
        expect(value.productName).toBe('Mandor Realtime');
        expect(value.executableName).toBe('mandor-realtime');
        expect(metadata.desktopName).toBe('mandor-realtime');
        expect(value.linux.syncDesktopName).toBe(true);
        // The deb target refuses to build without both: they are what its control file names.
        expect(value.linux.maintainer).toMatch(/^.+ <.+@.+>$/u);
        expect(metadata.homepage).toMatch(/^https:\/\//u);
        expect(value.win.target).toEqual([{ target: 'nsis', arch: ['x64', 'arm64'] }]);
        // The updater picks the installer of its architecture: one of both would only weigh.
        expect(value.nsis.buildUniversalInstaller).toBe(false);
        expect(value.mac.target).toEqual([
            { target: 'dmg', arch: ['x64', 'arm64'] },
            { target: 'zip', arch: ['x64', 'arm64'] },
        ]);
        expect(value.linux.target).toEqual([
            { target: 'AppImage', arch: ['x64', 'arm64'] },
            { target: 'deb', arch: ['x64', 'arm64'] },
        ]);
    });

    /**
     * The two apps share the repository, and its latest release can be either of them: each app
     * follows a fixed release of its own, and a stable writes the beta files too.
     */
    it('follows the feed of its own app on every channel', async () => {
        const value = await config();

        expect(value.publish).toEqual({
            provider: 'generic',
            url: 'https://github.com/joalvm/mandor/releases/download/realtime-feed',
        });
        expect(value.generateUpdatesFilesForAllChannels).toBe(true);
    });

    /** Unsigned, a download on Apple silicon says the app is damaged; ad-hoc, it can be allowed. */
    it('signs the mac app ad-hoc, without the runtime only notarizing needs', async () => {
        const value = await config();

        expect(value.mac).toMatchObject({ identity: '-', hardenedRuntime: false });
    });

    it('locks production code to an integrity-checked ASAR', async () => {
        const value = await config();

        expect(value.asar).toBe(true);
        expect(value.electronFuses).toMatchObject({
            runAsNode: false,
            enableCookieEncryption: true,
            enableNodeOptionsEnvironmentVariable: false,
            enableNodeCliInspectArguments: false,
            enableEmbeddedAsarIntegrityValidation: true,
            onlyLoadAppFromAsar: true,
        });
    });

    it('packages branded artwork for every supported platform', async () => {
        const value = await config();

        await Promise.all([
            access(join(APP_ROOT, 'resources/icon.png')),
            access(join(APP_ROOT, 'resources/icon.ico')),
        ]);
        expect(value.files).toContain('resources/icon.png');
        expect(value.win.icon).toBe('resources/icon.ico');
        expect(value.nsis.installerIcon).toBe('resources/icon.ico');
        expect(value.nsis.uninstallerIcon).toBe('resources/icon.ico');
        expect(value.mac.icon).toBe('resources/icon.png');
        expect(value.linux.icon).toBe('resources/icon.png');
    });

    /** The window is painted in the hue of the logo: the accent tells one app from the other. */
    it('paints its window in the teal of its logo', async () => {
        const page = await readFile(join(APP_ROOT, 'src/renderer/index.html'), 'utf8');

        expect(page).toMatch(/<html [^>]*data-accent="teal"/u);
    });

    /** Whoever receives the binary receives the license it comes under, not a link to it. */
    it('ships the license of the code inside the installer', async () => {
        const value = await config();
        const metadata = JSON.parse(await readFile(join(APP_ROOT, 'package.json'), 'utf8')) as {
            license?: string;
        };

        await access(join(APP_ROOT, '../../LICENSE'));
        expect(metadata.license).toBe('AGPL-3.0-only');
        expect(value.extraResources).toContainEqual({
            from: '../../LICENSE',
            to: 'licenses/LICENSE',
        });
    });

    /**
     * MIT, BSD and Apache-2.0 ask for their notices in every copy: the installer carries the ones
     * of what it bundles and loads, and the build notes, with paths of its machine, stay out.
     */
    it('ships the notices of the third-party code and of the marks beside the license', async () => {
        const value = await config();
        const scripts = (await manifest())['scripts'] as Record<string, string>;

        expect(scripts['build']).toContain('tools/notices/write-notices.mjs');
        expect(value.files).toContain('!out/licenses/**');
        expect(value.extraResources).toEqual(
            expect.arrayContaining([
                {
                    from: 'out/licenses/THIRD-PARTY-NOTICES.txt',
                    to: 'licenses/THIRD-PARTY-NOTICES.txt',
                },
                { from: '../../TRADEMARKS.md', to: 'licenses/TRADEMARKS.md' },
            ]),
        );
    });

    it('documents signing without requiring local credentials', async () => {
        const documentation = await readFile(join(APP_ROOT, 'README.md'), 'utf8');

        expect(documentation).toContain('CSC_LINK');
        expect(documentation).toContain('CSC_KEY_PASSWORD');
        expect(documentation).toContain('APPLE_ID');
        expect(documentation).toContain('APPLE_APP_SPECIFIC_PASSWORD');
    });
});

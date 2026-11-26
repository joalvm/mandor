import { describe, expect, it } from 'vitest';

import { feedFiles, pointAtRelease } from '../../publish/feed-files.mjs';

const BASE = 'https://github.com/joalvm/mandor/releases/download/sync-v0.1.0-beta.1/';

/** The shape electron-builder writes beside an installer of Windows. */
const WINDOWS = [
    'version: 0.1.0-beta.1',
    'files:',
    '  - url: Mandor-Request-0.1.0-beta.1-win-x64.exe',
    '    sha512: abc==',
    '    size: 123',
    'path: Mandor-Request-0.1.0-beta.1-win-x64.exe',
    'sha512: abc==',
    "releaseDate: '2026-11-26T10:00:00.000Z'",
    '',
].join('\n');

describe('an update file pointed at the release of its version', () => {
    it('names every installer in full and leaves the rest as it was', () => {
        expect(pointAtRelease(WINDOWS, BASE)).toBe(
            [
                'version: 0.1.0-beta.1',
                'files:',
                `  - url: ${BASE}Mandor-Request-0.1.0-beta.1-win-x64.exe`,
                '    sha512: abc==',
                '    size: 123',
                `path: ${BASE}Mandor-Request-0.1.0-beta.1-win-x64.exe`,
                'sha512: abc==',
                "releaseDate: '2026-11-26T10:00:00.000Z'",
                '',
            ].join('\n'),
        );
    });

    it('reads a name in quotes the same as a bare one', () => {
        expect(pointAtRelease("path: 'Mandor.zip'", BASE)).toBe(`path: ${BASE}Mandor.zip`);
    });

    it('leaves a name that is already an address as it is, so a second pass changes nothing', () => {
        const once = pointAtRelease(WINDOWS, BASE);

        expect(pointAtRelease(once, BASE)).toBe(once);
    });

    it('refuses a base with no slash at the end, which would drop the tag from every address', () => {
        expect(() => pointAtRelease(WINDOWS, BASE.slice(0, -1))).toThrow(/slash/u);
    });
});

describe('the update files of a build', () => {
    it('are the files of every channel, system and architecture, and nothing else', () => {
        expect(
            feedFiles([
                'latest.yml',
                'latest-mac.yml',
                'latest-linux.yml',
                'latest-linux-arm64.yml',
                'beta.yml',
                'alpha-mac.yml',
                'builder-debug.yml',
                'builder-effective-config.yaml',
                'Mandor-Request-0.1.0-win-x64.exe',
                'Mandor-Request-0.1.0-win-x64.exe.blockmap',
            ]),
        ).toEqual([
            'alpha-mac.yml',
            'beta.yml',
            'latest-linux-arm64.yml',
            'latest-linux.yml',
            'latest-mac.yml',
            'latest.yml',
        ]);
    });
});

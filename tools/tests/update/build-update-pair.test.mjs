import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
    FEED_URL,
    builderArgs,
    builderInvocation,
    platformTarget,
    versionsOf,
} from '../../update/build-update-pair.mjs';

describe('the versions of the pair', () => {
    it('starts from the beta of the version the app declares and arrives at that version', () => {
        expect(versionsOf('0.1.0')).toEqual({ from: '0.1.0-beta.1', to: '0.1.0' });
        expect(versionsOf('2.10.3')).toEqual({ from: '2.10.3-beta.1', to: '2.10.3' });
    });

    it('refuses a version that is already a prerelease, since there is no beta before it', () => {
        expect(() => versionsOf('0.1.0-beta.2')).toThrow(/prerelease/);
    });
});

describe('the target of each system', () => {
    it('builds the installer the updater can replace on its own', () => {
        expect(platformTarget('win32')).toEqual(['--win', 'nsis', '--x64']);
        expect(platformTarget('linux')).toEqual(['--linux', 'AppImage', '--x64']);
    });

    it('says which systems it covers when it is asked for another', () => {
        expect(() => platformTarget('darwin')).toThrow(/darwin.*Windows and Linux/s);
    });
});

describe('the arguments of electron-builder', () => {
    const base = { platform: 'linux', version: '0.1.0-beta.1', output: 'dist/update-pair/from' };

    it('writes the version, the output and the feed the installed app will look at', () => {
        const args = builderArgs(base);

        expect(args).toEqual(
            expect.arrayContaining([
                '--linux',
                'AppImage',
                '--x64',
                '--publish',
                'never',
                '-c.extraMetadata.version=0.1.0-beta.1',
                '-c.directories.output=dist/update-pair/from',
                '-c.publish.provider=generic',
                `-c.publish.url=${FEED_URL}`,
            ]),
        );
        expect(FEED_URL).toBe('http://127.0.0.1:47613/');
    });

    it('writes the feed of every channel only when asked, which is how a beta receives a stable', () => {
        expect(builderArgs(base)).not.toContain('-c.generateUpdatesFilesForAllChannels=true');
        expect(builderArgs({ ...base, allChannels: true })).toContain(
            '-c.generateUpdatesFilesForAllChannels=true',
        );
    });

    it('carries the notes as one argument, whatever they hold', () => {
        const notes = '## 0.1.0\n\n| a | b |\n| - | - |\n| 1 | 2 |';
        const args = builderArgs({ ...base, notes });

        expect(args).toContain(`-c.releaseInfo.releaseNotes=${notes}`);
        expect(args.filter((arg) => arg.includes('releaseNotes'))).toHaveLength(1);
    });
});

describe('how electron-builder is started', () => {
    it('runs its script with this node and no shell, so no system splits the notes', () => {
        const notes = '-c.releaseInfo.releaseNotes=## What changed\n\n| Area | Change |';

        expect(builderInvocation('root', ['--linux', notes])).toEqual({
            command: process.execPath,
            args: [join('root', 'node_modules', 'electron-builder', 'cli.js'), '--linux', notes],
            shell: false,
        });
    });
});

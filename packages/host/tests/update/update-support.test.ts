import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { updateSupport, type UpdateSupportInput } from '../../src/update/update-support.js';

const RESOURCES = join('opt', 'mandor', 'resources');
const FEED = { [join(RESOURCES, 'app-update.yml')]: 'provider: generic' };

function install(change: Partial<UpdateSupportInput> & { files?: Record<string, string> }) {
    const { files = FEED, ...rest } = change;

    return updateSupport({
        packaged: true,
        platform: 'win32',
        resourcesPath: RESOURCES,
        env: {},
        exists: (path) => path in files,
        read: (path) => files[path] ?? '',
        ...rest,
    });
}

describe('how far an install can follow the updates', () => {
    it('follows them on a packaged install of Windows that carries a feed', () => {
        expect(install({})).toBe('full');
    });

    it('does nothing when the app is not packaged', () => {
        expect(install({ packaged: false })).toBe('unsupported');
    });

    it('does nothing when the build was made with no feed inside', () => {
        expect(install({ files: {} })).toBe('unsupported');
    });

    it('waits on macOS until the app is signed', () => {
        expect(install({ platform: 'darwin' })).toBe('unsupported');
    });

    it('replaces the file of an AppImage by itself', () => {
        expect(install({ platform: 'linux', env: { APPIMAGE: '/home/a/Mandor.AppImage' } })).toBe(
            'full',
        );
    });

    it('only tells of a new version on a deb, which asks for an administrator to install', () => {
        const files = { ...FEED, [join(RESOURCES, 'package-type')]: 'deb\n' };

        expect(install({ platform: 'linux', files })).toBe('manual-only');
    });

    it.each([
        ['another package of linux', { ...FEED, [join(RESOURCES, 'package-type')]: 'rpm' }],
        ['a linux that says nothing of how it was installed', FEED],
    ])('does nothing on %s', (_name, files) => {
        expect(install({ platform: 'linux', files })).toBe('unsupported');
    });

    it('does nothing when the file that names the package cannot be read', () => {
        const files = { ...FEED, [join(RESOURCES, 'package-type')]: 'deb' };

        expect(
            install({
                platform: 'linux',
                files,
                read: () => {
                    throw new Error('EACCES');
                },
            }),
        ).toBe('unsupported');
    });

    it('does nothing on a platform it has no installer for', () => {
        expect(install({ platform: 'freebsd' })).toBe('unsupported');
    });
});

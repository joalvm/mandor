import { join } from 'node:path';

import type { UpdateSupport } from '@mandor/ipc';

/** What `updateSupport` needs to know of the install, all of it handed in. */
export type UpdateSupportInput = {
    packaged: boolean;
    platform: NodeJS.Platform;
    resourcesPath: string;
    env: Readonly<Record<string, string | undefined>>;
    exists: (path: string) => boolean;
    read: (path: string) => string;
};

/** The file electron-builder writes beside the app when it builds a package for a distro. */
const PACKAGE_TYPE = 'package-type';

/** The variable the AppImage runtime sets, which only an AppImage has. */
const APPIMAGE = 'APPIMAGE';

/** Where electron-builder leaves the feed the app follows, only when the build was told one. */
const FEED = 'app-update.yml';

function packageTypeOf(input: UpdateSupportInput): string {
    const path = join(input.resourcesPath, PACKAGE_TYPE);

    try {
        return input.exists(path) ? input.read(path).trim() : '';
    } catch {
        return '';
    }
}

function linuxSupport(input: UpdateSupportInput): UpdateSupport {
    const appImage = input.env[APPIMAGE];

    if (appImage !== undefined && appImage !== '') {
        return 'full';
    }

    // A deb asks for an administrator to install, so the app tells and the person goes to get it.
    if (packageTypeOf(input) === 'deb') {
        return 'manual-only';
    }

    return 'unsupported';
}

/**
 * The systems an install can update on. Squirrel.Mac installs only an app signed by a Developer ID:
 * signed ad-hoc, macOS hears of a version and the person downloads it.
 */
const SUPPORT_OF_PLATFORM: Readonly<
    Partial<Record<NodeJS.Platform, (input: UpdateSupportInput) => UpdateSupport>>
> = {
    darwin: () => 'manual-only',
    linux: linuxSupport,
    win32: () => 'full',
};

/**
 * How far this install can follow the updates, worked out once at the start. An install that was
 * built with no feed has nothing to ask.
 */
export function updateSupport(input: UpdateSupportInput): UpdateSupport {
    const supportOf = SUPPORT_OF_PLATFORM[input.platform];

    if (!input.packaged || supportOf === undefined) {
        return 'unsupported';
    }

    if (!input.exists(join(input.resourcesPath, FEED))) {
        return 'unsupported';
    }

    return supportOf(input);
}

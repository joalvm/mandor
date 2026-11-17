import { join } from 'node:path';

import {
    DEFAULT_NETWORK_SETTINGS,
    networkSettingsSchema,
    type NetworkSettings,
} from '@mandor/schema';
import { atomicWrite, readTextOrNull } from '@mandor/store-fs';

/** The settings of the network of this machine, beside the app and never inside an origin. */
const FILE = 'network.json';

/** The keychain entry of the password of the written proxy. */
export const PROXY_PASSWORD_KEY = 'network:proxy';

/** The keychain entry of the passphrase that opens the key of one client certificate. */
export function passphraseKey(certificateId: string): string {
    return `network:certificate:${certificateId}`;
}

export function networkSettingsFile(userDataDir: string): string {
    return join(userDataDir, FILE);
}

/**
 * What was kept, or the defaults: a file that does not parse is worth as much as a missing one.
 * One that is there and cannot be read fails, or every request would skip the proxy it names.
 */
export async function readNetworkSettings(userDataDir: string): Promise<NetworkSettings> {
    const source = (await readTextOrNull(networkSettingsFile(userDataDir))) ?? '';

    try {
        const parsed = networkSettingsSchema.safeParse(JSON.parse(source));

        return parsed.success ? parsed.data : DEFAULT_NETWORK_SETTINGS;
    } catch {
        return DEFAULT_NETWORK_SETTINGS;
    }
}

export async function writeNetworkSettings(
    userDataDir: string,
    settings: NetworkSettings,
): Promise<void> {
    await atomicWrite(networkSettingsFile(userDataDir), JSON.stringify(settings, null, 4));
}

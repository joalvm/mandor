import {
    CHANNELS,
    networkChooseFileRequestSchema,
    networkSecretRequestSchema,
    networkWriteRequestSchema,
    success,
    type Empty,
    type NetworkFilePurpose,
    type NetworkSecretRequest,
    type NetworkState,
    type Result,
} from '@mandor/ipc';
import type { NetworkSettings } from '@mandor/schema';
import { inTurn } from '@mandor/store-fs';
import { z } from 'zod';

import { checkedRequest } from '../ipc/checked-request.js';
import type { HandlerIpc } from '../ipc/handler-ipc.js';
import { clearSecret, readSecret, storeSecret } from '../origin/secret-store.js';
import {
    networkSettingsFile,
    passphraseKey,
    PROXY_PASSWORD_KEY,
    readNetworkSettings,
    writeNetworkSettings,
} from './network-store.js';

export type NetworkHandlerDeps = {
    userDataDir: string;
    /** The open dialog of the system, offering the files of one purpose; null is a change of mind. */
    chooseFile: (purpose: NetworkFilePurpose) => Promise<string | null>;
};

const NO_REQUEST = z.object({}).strict();

function keyOf(target: NetworkSecretRequest['target']): string {
    if (target.kind === 'proxy') {
        return PROXY_PASSWORD_KEY;
    }

    return passphraseKey(target.id);
}

/** Whether the keychain keeps a value under a key; a machine without one keeps nothing. */
async function isKept(userDataDir: string, key: string): Promise<boolean> {
    return (await readSecret(userDataDir, key).catch(() => null)) !== null;
}

async function stateOf(userDataDir: string): Promise<NetworkState> {
    const settings = await readNetworkSettings(userDataDir);
    const ids = settings.clientCertificates.map((certificate) => certificate.id);
    const kept = await Promise.all(ids.map((id) => isKept(userDataDir, passphraseKey(id))));

    return {
        settings,
        kept: {
            proxyPassword: await isKept(userDataDir, PROXY_PASSWORD_KEY),
            passphrases: ids.filter((_id, index) => kept[index]),
        },
    };
}

/** A certificate taken off the list takes its passphrase with it: nothing names it any more. */
async function write(userDataDir: string, settings: NetworkSettings): Promise<Result<Empty>> {
    // The window saves on every change without waiting for the save before. Each takes its turn,
    // so it reads the list the one before left and forgets the passphrases it took off.
    await inTurn(networkSettingsFile(userDataDir), async () => {
        const before = await readNetworkSettings(userDataDir);
        const staying = new Set(settings.clientCertificates.map((certificate) => certificate.id));
        const gone = before.clientCertificates.filter(
            (certificate) => !staying.has(certificate.id),
        );

        await writeNetworkSettings(userDataDir, settings);
        await Promise.all(
            gone.map((certificate) => clearSecret(userDataDir, passphraseKey(certificate.id))),
        );
    });

    return success({});
}

async function setSecret(
    userDataDir: string,
    request: NetworkSecretRequest,
): Promise<Result<Empty>> {
    const key = keyOf(request.target);

    await (request.value === ''
        ? clearSecret(userDataDir, key)
        : storeSecret(userDataDir, key, request.value));

    return success({});
}

/**
 * The channels of the network settings. The settings live beside the app, in userData; the
 * secrets in the keychain; and a path enters only through the open dialog of the system, so a
 * renderer can never point main at a file the user did not pick.
 */
export function registerNetworkHandlers(ipc: HandlerIpc, deps: NetworkHandlerDeps): () => void {
    const { userDataDir } = deps;

    ipc.handle(CHANNELS.networkRead, async (_event, raw) => {
        const request = checkedRequest(NO_REQUEST, raw ?? {});

        return request.ok ? success(await stateOf(userDataDir)) : request;
    });
    ipc.handle(CHANNELS.networkWrite, async (_event, raw) => {
        const request = checkedRequest(networkWriteRequestSchema, raw);

        return request.ok ? write(userDataDir, request.value) : request;
    });
    ipc.handle(CHANNELS.networkSecret, async (_event, raw) => {
        const request = checkedRequest(networkSecretRequestSchema, raw);

        return request.ok ? setSecret(userDataDir, request.value) : request;
    });
    ipc.handle(CHANNELS.networkChooseFile, async (_event, raw) => {
        const request = checkedRequest(networkChooseFileRequestSchema, raw);

        return request.ok ? success(await deps.chooseFile(request.value.purpose)) : request;
    });

    return () => {
        ipc.removeHandler(CHANNELS.networkRead);
        ipc.removeHandler(CHANNELS.networkWrite);
        ipc.removeHandler(CHANNELS.networkSecret);
        ipc.removeHandler(CHANNELS.networkChooseFile);
    };
}

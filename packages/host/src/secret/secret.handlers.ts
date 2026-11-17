import {
    CHANNELS,
    failure,
    secretClearRequestSchema,
    secretKeptRequestSchema,
    secretRevealRequestSchema,
    secretSetRequestSchema,
    success,
    type Empty,
    type Result,
    type RevealedSecret,
} from '@mandor/ipc';
import { readEnvironment } from '@mandor/store-fs';
import type { ZodType } from 'zod';

import { failureOf } from '../ipc/failure-of.js';
import type { HandlerIpc } from '../ipc/handler-ipc.js';
import type { Logger } from '../log/create-logger.js';
import { activeRepo, type ActiveRepo } from '../origin/active-repo.js';
import { clearSecret, heldSecretKeys, readSecret, storeSecret } from '../origin/secret-store.js';
import { environmentSecretKey } from './environment-secret-key.js';
import { forgetSecret, readSecretIndex, rememberSecret } from './secret-index.js';

export type SecretHandlerDeps = {
    userDataDir: string;
    logger: Logger;
};

/** Where a request landed: the origin main resolved it against, and the request itself. */
type Placed<T> = {
    repo: ActiveRepo;
    request: T;
};

/**
 * The four channels a secret travels on, and the one that carries a value towards the renderer
 * carries one value, by name, because the owner asked for it. There is no channel that reads
 * the secrets of an environment in one go: that is an exfiltration path with a friendly name.
 */
export function registerSecretHandlers(ipc: HandlerIpc, deps: SecretHandlerDeps): () => void {
    ipc.handle(CHANNELS.secretSet, (_event, raw) => setSecret(deps, raw));
    ipc.handle(CHANNELS.secretClear, (_event, raw) => dropSecret(deps, raw));
    ipc.handle(CHANNELS.secretReveal, (_event, raw) => revealSecret(deps, raw));
    ipc.handle(CHANNELS.secretKept, (_event, raw) => keptSecrets(deps, raw));

    return () => {
        ipc.removeHandler(CHANNELS.secretSet);
        ipc.removeHandler(CHANNELS.secretClear);
        ipc.removeHandler(CHANNELS.secretReveal);
        ipc.removeHandler(CHANNELS.secretKept);
    };
}

async function setSecret(deps: SecretHandlerDeps, raw: unknown): Promise<Result<Empty>> {
    const placed = placedRequest(secretSetRequestSchema, raw);

    if (!placed.ok) {
        return placed;
    }

    const { repo, request } = placed.value;
    const key = environmentSecretKey({ ...request, repo: repo.id }, request.name);

    try {
        // The index tells the next run what this machine keeps; a value held in memory is gone by then.
        if ((await storeSecret(deps.userDataDir, key, request.value)) === 'disk') {
            await rememberSecret(repo.root, key);
        }

        return success({});
    } catch (error) {
        return failureOf(error);
    }
}

async function dropSecret(deps: SecretHandlerDeps, raw: unknown): Promise<Result<Empty>> {
    const placed = placedRequest(secretClearRequestSchema, raw);

    if (!placed.ok) {
        return placed;
    }

    const { repo, request } = placed.value;
    const key = environmentSecretKey({ ...request, repo: repo.id }, request.name);

    try {
        await clearSecret(deps.userDataDir, key);
        await forgetSecret(repo.root, key);

        return success({});
    } catch (error) {
        return failureOf(error);
    }
}

/** The one exception, and it is written down: who was revealed, never what was revealed. */
async function revealSecret(
    deps: SecretHandlerDeps,
    raw: unknown,
): Promise<Result<RevealedSecret>> {
    const placed = placedRequest(secretRevealRequestSchema, raw);

    if (!placed.ok) {
        return placed;
    }

    const { repo, request } = placed.value;
    const key = environmentSecretKey({ ...request, repo: repo.id }, request.name);

    try {
        const value = await readSecret(deps.userDataDir, key);

        deps.logger.log('info', `the value of ${key} was revealed to its owner`);

        return success({ value });
    } catch (error) {
        return failureOf(error);
    }
}

async function keptSecrets(deps: SecretHandlerDeps, raw: unknown): Promise<Result<string[]>> {
    const placed = placedRequest(secretKeptRequestSchema, raw);

    if (!placed.ok) {
        return placed;
    }

    const { repo, request } = placed.value;

    try {
        const environment = await readEnvironment(
            repo.root,
            request.workspaceId,
            request.environmentId,
        );
        const keys = [...(await readSecretIndex(repo.root)), ...heldSecretKeys(deps.userDataDir)];
        const place = { ...request, repo: repo.id };

        return success(
            environment.variables
                .filter((variable) => variable.secret)
                .map((variable) => variable.name)
                .filter((name) => keys.includes(environmentSecretKey(place, name))),
        );
    } catch (error) {
        return failureOf(error);
    }
}

/**
 * Every request arrives from a renderer, so it is doubted twice: against the schema of its
 * channel, and against the origin main has open. Neither answer is an exception.
 */
function placedRequest<T>(schema: ZodType<T>, raw: unknown): Result<Placed<T>> {
    const parsed = schema.safeParse(raw);

    if (!parsed.success) {
        return failure('bad-request', parsed.error.message);
    }

    const repo = activeRepo();

    if (!repo.ok) {
        return repo;
    }

    return success({ repo: repo.value, request: parsed.data });
}

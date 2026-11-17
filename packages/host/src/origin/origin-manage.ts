import { rm } from 'node:fs/promises';

import { remoteReachable } from '@mandor/git';
import {
    failure,
    originCheckRequestSchema,
    originRemoveRequestSchema,
    originRenameRequestSchema,
    success,
    type Empty,
    type OriginCheck,
    type Result,
} from '@mandor/ipc';
import { LOCAL_ORIGIN_ID, splitOriginUrl, type Origin } from '@mandor/schema';

import { failureOf } from '../ipc/failure-of.js';
import { activeOriginRoot } from './active-origin.js';
import { leaveActiveOrigin } from './leave-active-origin.js';
import { forgetOrigin, rememberOrigin } from './origins.js';
import { storedOriginById } from './stored-origin-by-id.js';
import { clearSecret, readSecret } from './secret-store.js';
import { originSecretKey } from './origin-secret-key.js';
import type { OriginHandlerDeps } from './origin-handler-deps.js';
import { toOrigin, type StoredOrigin } from './stored-origin.js';

/**
 * The check of one origin: the same question the add asked, again. A refusal to answer is the
 * answer the table paints — `reachable: false` — and only a request that cannot be asked at
 * all is a failure of the channel.
 */
export async function checkOrigin(
    deps: OriginHandlerDeps,
    raw: unknown,
): Promise<Result<OriginCheck>> {
    const request = originCheckRequestSchema.safeParse(raw);

    if (!request.success) {
        return failure('bad-request', request.error.message);
    }

    const found = await storedOriginById(deps.userDataDir, request.data.id);

    if (!found.ok) {
        return found;
    }

    const origin = found.value;

    if (origin.kind === 'local') {
        return success({ id: origin.id, reachable: true });
    }

    const url = origin.url ?? '';

    try {
        const split = splitOriginUrl(url);
        const token = await readSecret(deps.userDataDir, originSecretKey(origin.id)).catch(
            () => null,
        );

        await remoteReachable(token === null ? split : { ...split, token });

        return success({ id: origin.id, reachable: true });
    } catch {
        return success({ id: origin.id, reachable: false });
    }
}

/** Forgetting an origin takes it off the list and takes its copy off this machine. */
export async function removeOrigin(deps: OriginHandlerDeps, raw: unknown): Promise<Result<Empty>> {
    const request = originRemoveRequestSchema.safeParse(raw);

    if (!request.success) {
        return failure('bad-request', request.error.message);
    }

    if (request.data.id === LOCAL_ORIGIN_ID) {
        return failure('bad-request', 'the local origin cannot be removed');
    }

    try {
        const found = await storedOriginById(deps.userDataDir, request.data.id);

        if (!found.ok) {
            return found;
        }

        const origin = found.value;

        // The window may be working in the very origin it removes: its watcher and its sync
        // stop, and its last commits land, before the directory goes.
        if (activeOriginRoot() === origin.root) {
            await leaveActiveOrigin();
        }

        // Windows holds the handles of git and of the watcher a moment after they close.
        await rm(origin.root, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
        await clearSecret(deps.userDataDir, originSecretKey(origin.id));
        await forgetOrigin(deps.userDataDir, origin.id);

        return success({});
    } catch (error) {
        return failureOf(error);
    }
}

/** The name moves; the id, the kind and the directory stay as they are. */
export async function renameOrigin(deps: OriginHandlerDeps, raw: unknown): Promise<Result<Origin>> {
    const request = originRenameRequestSchema.safeParse(raw);

    if (!request.success) {
        return failure('bad-request', request.error.message);
    }

    try {
        const found = await storedOriginById(deps.userDataDir, request.data.id);

        if (!found.ok) {
            return found;
        }

        const origin = found.value;

        const renamed: StoredOrigin = { ...origin, name: request.data.name };

        await rememberOrigin(deps.userDataDir, renamed);

        return success(toOrigin(renamed));
    } catch (error) {
        return failureOf(error);
    }
}

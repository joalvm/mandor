import {
    authTokenRequestSchema,
    CHANNELS,
    failure,
    success,
    type AuthTokenStatus,
    type Empty,
    type Result,
} from '@mandor/ipc';
import type { OAuth2ClientCredentials, OAuth2CodePkce } from '@mandor/schema';

import { failureOf } from '../ipc/failure-of.js';
import { fetchThrough } from '../network/fetch-through.js';
import type { NetworkFor } from '../network/network-for.js';
import type { HandlerIpc } from '../ipc/handler-ipc.js';
import { activeRepo } from '../origin/active-repo.js';
import { readSecret } from '../origin/secret-store.js';
import { oauthLevelOf } from './oauth/oauth-level.js';
import { openInSystemBrowser } from './oauth/open-in-system-browser.js';
import { forgetToken } from './oauth/token-cache.js';
import { tokenFor } from './oauth/token-for.js';
import { tokenKeyOfAuth } from './oauth/token-key.js';
import { tokenStatusOf } from './oauth/token-status.js';

export type AuthTokenHandlersDeps = {
    userDataDir: string;
    /** How the token endpoint is reached: the network the sends go out by. */
    networkFor: NetworkFor;
};

type Level = {
    root: string;
    workspaceId: string;
    environmentId: string | null;
    auth: OAuth2ClientCredentials | OAuth2CodePkce;
};

const NONE: AuthTokenStatus = { state: 'none', expiresAt: null };

/**
 * The token of an OAuth2 level, seen and governed from the window: its state, a new one, or
 * none. Every answer is the state or empty — the token is never in one — and the three share the
 * same entrance, so none of them can resolve a level differently from the others.
 */
export function registerAuthTokenHandlers(
    ipc: HandlerIpc,
    deps: AuthTokenHandlersDeps,
): () => void {
    ipc.handle(CHANNELS.authTokenStatus, (_event, raw) =>
        withLevel(deps, raw, NONE, (level) => statusOf(level)),
    );
    ipc.handle(CHANNELS.authTokenFetch, (_event, raw) =>
        withLevel(deps, raw, undefined, (level) => fetched(level, deps.networkFor)),
    );
    ipc.handle(CHANNELS.authTokenForget, (_event, raw) => withLevel(deps, raw, {}, forgotten));

    return () => {
        ipc.removeHandler(CHANNELS.authTokenStatus);
        ipc.removeHandler(CHANNELS.authTokenFetch);
        ipc.removeHandler(CHANNELS.authTokenForget);
    };
}

function statusOf(level: Level): Promise<AuthTokenStatus> {
    return tokenStatusOf(level.root, level.auth, level.workspaceId, level.environmentId);
}

/** A new token: the old one goes first, so the person always gets the one they asked for. */
async function fetched(level: Level, networkFor: NetworkFor): Promise<AuthTokenStatus> {
    await forgetOf(level);
    await tokenFor({
        ...level,
        openExternal: openInSystemBrowser,
        fetch: fetchThrough(networkFor),
    });

    return statusOf(level);
}

async function forgotten(level: Level): Promise<Empty> {
    await forgetOf(level);

    return {};
}

function forgetOf(level: Level): Promise<void> {
    return forgetToken(
        level.root,
        tokenKeyOfAuth(level.auth, level.workspaceId, level.environmentId),
    );
}

/**
 * Validates the request, finds the OAuth2 level it names and runs the operation on it. A place
 * where no OAuth2 scheme rules answers `whenNone` — a status says there is no token — and a
 * fetch, which has no default (`undefined`), says the request makes no sense.
 */
async function withLevel<T>(
    deps: AuthTokenHandlersDeps,
    raw: unknown,
    whenNone: T | undefined,
    run: (level: Level) => Promise<T>,
): Promise<Result<T>> {
    const request = authTokenRequestSchema.safeParse(raw);
    const repo = activeRepo();

    if (!request.success) {
        return failure('bad-request', request.error.message);
    }

    if (!repo.ok) {
        return repo;
    }

    try {
        const { workspaceId, environmentId, own, parentPath } = request.data;
        const place = {
            root: repo.value.root,
            repo: repo.value.id,
            readSecret: (key: string) => readSecret(deps.userDataDir, key),
        };
        const auth = await oauthLevelOf(place, { workspaceId, environmentId, own, parentPath });

        if (auth === null) {
            return whenNone === undefined
                ? failure('bad-request', 'no OAuth2 level rules this place')
                : success(whenNone);
        }

        return success(await run({ root: place.root, workspaceId, environmentId, auth }));
    } catch (error) {
        return failureOf(error);
    }
}

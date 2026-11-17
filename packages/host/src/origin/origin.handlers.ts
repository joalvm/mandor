import { lastChange, remoteReachable } from '@mandor/git';
import {
    CHANNELS,
    failure,
    originAddRequestSchema,
    originEmptyRequestSchema,
    originSwitchRequestSchema,
    success,
    type OpenedOrigin,
    type Result,
} from '@mandor/ipc';
import { OriginUrlError, splitOriginUrl, type Origin, type OriginSyncState } from '@mandor/schema';
import { emptyRepo, loadRepo } from '@mandor/store-fs';

import { failureOf } from '../ipc/failure-of.js';
import type { HandlerIpc } from '../ipc/handler-ipc.js';
import { reshapeRepo } from '../repo/reshape-repo.js';
import { setActiveOrigin } from './active-origin.js';
import { openOriginRuntime, openSyncState } from './origin-runtime.js';
import { migrateOrigin } from '../repo/migrate-origin.js';
import { addOrigin } from './add-origin.js';
import { ensureOriginCopy } from './ensure-origin-copy.js';
import { leaveActiveOrigin } from './leave-active-origin.js';
import { forgetUnreadable, reportUnreadable } from '../notice/unreadable-files.js';
import type { OriginHandlerDeps } from './origin-handler-deps.js';
import { originAccess } from './origin-access.js';
import { checkOrigin, removeOrigin, renameOrigin } from './origin-manage.js';
import { listOrigins, rememberOrigin } from './origins.js';
import { storedOriginById } from './stored-origin-by-id.js';
import { toOrigin } from './stored-origin.js';

/**
 * The channels a renderer uses to reach an origin. It never learns a path layout, a git
 * command or a YAML file: it asks for origins, adds and empties them, checks whether one
 * answers, renames and forgets them, and switches between them by id.
 */
export function registerOriginHandlers(ipc: HandlerIpc, deps: OriginHandlerDeps): () => void {
    ipc.handle(CHANNELS.originAdd, (_event, raw) => add(deps, raw));
    ipc.handle(CHANNELS.originCheck, (_event, raw) => checkOrigin(deps, raw));
    ipc.handle(CHANNELS.originEmpty, (_event, raw) => empty(deps, raw));
    ipc.handle(CHANNELS.originList, () => list(deps));
    ipc.handle(CHANNELS.originRemove, (_event, raw) => removeOrigin(deps, raw));
    ipc.handle(CHANNELS.originRename, (_event, raw) => renameOrigin(deps, raw));
    ipc.handle(CHANNELS.originState, () =>
        Promise.resolve(success<OriginSyncState | null>(openSyncState())),
    );
    ipc.handle(CHANNELS.originSwitch, (_event, raw) => switchTo(deps, raw));

    return () => {
        ipc.removeHandler(CHANNELS.originAdd);
        ipc.removeHandler(CHANNELS.originCheck);
        ipc.removeHandler(CHANNELS.originEmpty);
        ipc.removeHandler(CHANNELS.originList);
        ipc.removeHandler(CHANNELS.originRemove);
        ipc.removeHandler(CHANNELS.originRename);
        ipc.removeHandler(CHANNELS.originState);
        ipc.removeHandler(CHANNELS.originSwitch);
    };
}

/** The list the renderer sees. The root of each origin stays in main and never crosses. */
async function list(deps: OriginHandlerDeps): Promise<Result<Origin[]>> {
    try {
        const stored = await listOrigins(deps.userDataDir);

        return success(stored.map(toOrigin));
    } catch (error) {
        return failureOf(error);
    }
}

/**
 * An origin enters the list only after answering: main asks the url for its refs, and an
 * origin that does not answer is refused with a reason, never stored in silence.
 */
async function add(deps: OriginHandlerDeps, raw: unknown): Promise<Result<Origin>> {
    const request = originAddRequestSchema.safeParse(raw);

    if (!request.success) {
        return failure('bad-request', request.error.message);
    }

    try {
        const split = splitOriginUrl(request.data.url);

        await remoteReachable(split);

        const stored = await addOrigin(deps, request.data);

        return success(toOrigin(stored));
    } catch (error) {
        if (error instanceof OriginUrlError) {
            return failure('bad-request', error.message);
        }

        return failure('origin-unreachable', String(error));
    }
}

/** Emptying removes the workspaces of an origin and keeps the origin. Local can be emptied. */
async function empty(deps: OriginHandlerDeps, raw: unknown): Promise<Result<object>> {
    const request = originEmptyRequestSchema.safeParse(raw);

    if (!request.success) {
        return failure('bad-request', request.error.message);
    }

    try {
        const found = await storedOriginById(deps.userDataDir, request.data.id);

        if (!found.ok) {
            return found;
        }

        const origin = found.value;

        await reshapeRepo(
            {
                root: origin.root,
                paths: ['mandor.yaml', 'workspaces'],
                change: { kind: 'empty-repo' },
            },
            () => emptyRepo(origin.root),
        );

        return success({});
    } catch (error) {
        return failureOf(error);
    }
}

async function switchTo(deps: OriginHandlerDeps, raw: unknown): Promise<Result<OpenedOrigin>> {
    const request = originSwitchRequestSchema.safeParse(raw);

    if (!request.success) {
        return failure('bad-request', request.error.message);
    }

    try {
        const found = await storedOriginById(deps.userDataDir, request.data.id);

        if (!found.ok) {
            return found;
        }

        const origin = found.value;

        await ensureOriginCopy(deps.userDataDir, origin);
        await leaveActiveOrigin();
        setActiveOrigin(origin);
        openOriginRuntime(origin, deps.logger, {
            name: origin.name,
            kind: origin.kind,
            access: () => originAccess(deps.userDataDir, origin),
        });
        await rememberOrigin(deps.userDataDir, origin);

        // An origin an older build saved is brought to the current format before it is read.
        await migrateOrigin(origin.root);

        const opened = await loadRepo(origin.root);

        forgetUnreadable(deps.notices);
        reportUnreadable(deps.notices, deps.logger, opened.warnings);

        const workspaces = await Promise.all(
            opened.workspaces.map(async (workspace) => ({
                ...workspace,
                modifiedAt: await lastChange(origin.root, `workspaces/${workspace.id}`),
            })),
        );

        return success({ repo: opened.repo, workspaces });
    } catch (error) {
        return failureOf(error);
    }
}

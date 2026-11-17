import { rootedHandler, type HandlerIpc } from '@mandor/host';
import {
    CHANNELS,
    cookiesClearRequestSchema,
    cookiesDeleteRequestSchema,
    cookiesListRequestSchema,
    cookiesSetRequestSchema,
    failure,
    success,
    type Channel,
    type Result,
} from '@mandor/ipc';
import type { CookieJar } from 'tough-cookie';
import type { z } from 'zod';

import type { CookieJarStore } from './cookie-jar-store.js';
import { cookieRowOf } from './cookie-row-of.js';

const CHANNEL_LIST: Channel[] = [
    CHANNELS.cookiesList,
    CHANNELS.cookiesSet,
    CHANNELS.cookiesDelete,
    CHANNELS.cookiesClear,
];

/** What the four requests share: whose jar it is. */
type JarRequest = { workspaceId: string; environmentId: string | null };

/** A value the `Cookie` header could not carry: it would split the cookie, or the header. */
function isUnsafe(value: string): boolean {
    return /[;\p{Cc}]/u.test(value);
}

/**
 * A channel of the jar: the jar of the environment is opened over the active origin, and what
 * the work changed is written before the answer, so a window that asks again reads what was
 * kept. The work may refuse on its own account; that refusal is the answer.
 */
function answer<Input extends JarRequest, T>(
    schema: z.ZodType<Input>,
    jars: CookieJarStore,
    work: (jar: CookieJar, input: Input) => Promise<Result<T>>,
    writes: boolean,
): (_event: unknown, raw: unknown) => Promise<Result<T>> {
    const run = rootedHandler(schema, async (root, input) => {
        const { workspaceId, environmentId } = input;
        const place = { root, workspaceId, environmentId };
        const done = await work(await jars.jarOf(place), input);

        if (writes && done.ok) {
            await jars.save(place);
        }

        return done;
    });

    return async (_event, raw) => {
        const answered = await run(raw);

        return answered.ok ? answered.value : answered;
    };
}

/** The four channels of the jar: list its cookies, change the value of one, delete one, empty it. */
export function registerCookiesHandlers(ipc: HandlerIpc, jars: CookieJarStore): () => void {
    ipc.handle(
        CHANNELS.cookiesList,
        answer(
            cookiesListRequestSchema,
            jars,
            async (jar) => {
                const now = Date.now();
                const live = (await jar.store.getAllCookies()).filter(
                    (cookie) => (cookie.expiryTime() ?? Infinity) > now,
                );

                return success({ cookies: live.map(cookieRowOf) });
            },
            false,
        ),
    );
    ipc.handle(
        CHANNELS.cookiesSet,
        answer(
            cookiesSetRequestSchema,
            jars,
            async (jar, input) => {
                const found = await jar.store.findCookie(input.domain, input.path, input.name);
                const next = found?.clone();

                if (found === undefined || next === undefined) {
                    return failure('bad-request', 'The jar holds no such cookie');
                }

                if (isUnsafe(input.value)) {
                    return failure(
                        'bad-request',
                        'A cookie value cannot hold `;` or control characters',
                    );
                }

                next.value = input.value;
                await jar.store.updateCookie(found, next);

                return success({});
            },
            true,
        ),
    );
    ipc.handle(
        CHANNELS.cookiesDelete,
        answer(
            cookiesDeleteRequestSchema,
            jars,
            async (jar, input) => {
                await jar.store.removeCookie(input.domain, input.path, input.name);

                return success({});
            },
            true,
        ),
    );
    ipc.handle(
        CHANNELS.cookiesClear,
        answer(
            cookiesClearRequestSchema,
            jars,
            async (jar) => {
                await jar.removeAllCookies();

                return success({});
            },
            true,
        ),
    );

    return () => {
        CHANNEL_LIST.forEach((channel) => {
            ipc.removeHandler(channel);
        });
    };
}

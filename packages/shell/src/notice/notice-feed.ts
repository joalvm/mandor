import type { NoticeCode, NoticeParam, NoticePush } from '@mandor/ipc';
import type { ToastRequest } from '@mandor/ui';

import { bridge } from '../bridge.js';
import { fireAndForget } from '../fire-and-forget.js';

/** Says a code in the language of the window, with the values main attached to it. */
export type NoticeTranslator = (
    code: NoticeCode | 'relaunch',
    params: Record<string, number | string>,
) => string;

/** The way out a code offers beside its text, when it has one. */
function actionOf(push: NoticePush, translate: NoticeTranslator): ToastRequest['action'] {
    if (push.code !== 'main-fault') {
        return undefined;
    }

    return {
        label: translate('relaunch', {}),
        onSelect: () => {
            fireAndForget(bridge.window.relaunch());
        },
    };
}

/** A list reads as one text; the separator is the window's to choose, not main's. */
function flat(value: NoticeParam): number | string {
    return Array.isArray(value) ? value.join(', ') : value;
}

function paramsOf(push: NoticePush): Record<string, number | string> {
    return Object.fromEntries(
        Object.entries(push.params ?? {}).map(([name, value]) => [name, flat(value)]),
    );
}

/**
 * Tells the person each notice main raises, whether it was raised before the window listened
 * or after. The listener goes first and the list second, so nothing falls between them; a
 * notice that arrives by both is the same `id` and is told once. `told` outlives one call on
 * purpose: a window that listens again must not tell again what it already told.
 */
export function listenNotices(
    translate: NoticeTranslator,
    notify: (request: ToastRequest) => void,
    told = new Set<number>(),
): () => void {
    let listening = true;

    const tell = (push: NoticePush): void => {
        if (!listening || told.has(push.id)) {
            return;
        }

        told.add(push.id);
        notify({
            action: actionOf(push, translate),
            key: push.key,
            title: translate(push.code, paramsOf(push)),
            tone: push.tone,
        });
    };

    const stop = bridge.notice.onRaised(tell);

    fireAndForget(
        bridge.notice.list().then((result) => {
            if (result.ok) {
                result.value.forEach(tell);
            }
        }),
    );

    return () => {
        listening = false;
        stop();
    };
}

import { shellStore } from '@mandor/shell';
import { MESSAGE_PAYLOAD_TYPES, parseMessagePayloadType } from '@mandor/schema';
import { z } from 'zod';

import { composerEventsStore, type ComposerEvent } from './composer-events-store.js';

/**
 * What a draft on the session looks like. It is the composer's own event said plainly, and a
 * file someone edited by hand only loses the one key that fails: a payload type this build does
 * not know is read the way the domain reads it, as JSON until somebody says otherwise.
 */
const draftSchema = z.object({
    dirty: z.boolean(),
    eventName: z.string(),
    eventResource: z.string(),
    payload: z.string(),
    payloadType: z.enum(MESSAGE_PAYLOAD_TYPES).or(z.string().transform(parseMessagePayloadType)),
    schema: z.string(),
    expectAck: z.object({ enabled: z.boolean(), timeoutMs: z.number() }).optional(),
});

/**
 * The composer of a connection is not written down anywhere in the work: the event it holds is
 * a draft, and it dies with the tab. What dies with the app is another thing — a window that is
 * closed and opened again brings every connection tab back with the event it was composing, the
 * way the session brings the tabs themselves. Closing the tab is letting the draft go: the
 * connection reopens with its composer empty, ready for the next event.
 *
 * The drafts travel on the session's `tabState`, keyed by connection id, which is the id of the
 * tab that holds the connection. This module is the only writer and the only reader of those
 * keys: it lays the composer down on every change and picks it back up when a session lands.
 */
export function registerComposerDrafts(): () => void {
    let carried: Record<string, unknown> | null = null;

    const layDown = composerEventsStore.subscribe((state) => {
        shellStore.getState().setTabState(draftsOf(state.byConnection));
    });

    const pickUp = shellStore.subscribe((state) => {
        // A session load replaces the bag whole; the drafts this module laid down come back as
        // the same reference it handed over, and picking them up again would only start a loop.
        if (state.tabState === carried) {
            return;
        }

        carried = state.tabState;

        for (const [connectionId, value] of Object.entries(state.tabState)) {
            const draft = draftSchema.safeParse(value);

            if (!draft.success) {
                continue;
            }

            if (composerEventsStore.getState().byConnection[connectionId] === undefined) {
                composerEventsStore.getState().restore(connectionId, draft.data);
            }
        }
    });

    return () => {
        layDown();
        pickUp();
    };
}

/** The bag the session carries: one plain draft per connection that is holding an event. */
function draftsOf(
    byConnection: Record<string, ComposerEvent | undefined>,
): Record<string, unknown> {
    return Object.fromEntries(
        Object.entries(byConnection).flatMap(([connectionId, event]) =>
            event === undefined ? [] : [[connectionId, { ...event }]],
        ),
    );
}

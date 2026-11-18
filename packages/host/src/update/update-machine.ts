import { UPDATE_NOTES_MAX, type UpdateState, type UpdateSupport } from '@mandor/ipc';

import type { UpdatePortEvent } from './update-port.js';

/** The state of an install that has not looked for anything yet. */
export function initialUpdateState(current: string, support: UpdateSupport): UpdateState {
    return { phase: 'idle', support, current };
}

function stateWith(state: UpdateState, change: Partial<UpdateState>): UpdateState {
    return { ...state, next: undefined, progress: undefined, error: undefined, ...change };
}

/** A look that starts or ends must not interrupt a download in progress. */
function whileIdle(state: UpdateState, phase: 'checking' | 'idle'): UpdateState {
    if (state.phase === 'downloading') {
        return state;
    }

    return stateWith(state, { phase });
}

type EventOf<T extends UpdatePortEvent['type']> = Extract<UpdatePortEvent, { type: T }>;

/** The state each event of the updater leads to. */
const NEXT_OF_EVENT: {
    [T in UpdatePortEvent['type']]: (state: UpdateState, event: EventOf<T>) => UpdateState;
} = {
    'checking-for-update': (state) => whileIdle(state, 'checking'),
    'update-available': (state, event) =>
        stateWith(state, { phase: 'available', next: event.info }),
    'update-not-available': (state) => whileIdle(state, 'idle'),
    'download-progress': (state, event) =>
        stateWith(state, {
            phase: 'downloading',
            next: state.next,
            progress: Math.min(100, Math.max(0, Math.round(event.percent))),
        }),
    'update-downloaded': (state, event) => stateWith(state, { phase: 'ready', next: event.info }),
    error: (state, event) =>
        stateWith(state, { phase: 'error', next: state.next, error: event.code }),
};

function nextIn<T extends UpdatePortEvent['type']>(
    type: T,
    state: UpdateState,
    event: EventOf<T>,
): UpdateState {
    return NEXT_OF_EVENT[type](state, event);
}

/**
 * The state after one event of the updater. A version already downloaded is kept whatever comes
 * next: a later look that finds nothing, or fails, must not take away what is ready to install.
 */
export function nextUpdateState(state: UpdateState, event: UpdatePortEvent): UpdateState {
    if (state.phase === 'ready' && event.type !== 'update-downloaded') {
        return state;
    }

    return nextIn(event.type, state, event);
}

type ReleaseNote = { version?: unknown; note?: unknown };

function noteOf(entry: ReleaseNote): string {
    const note = typeof entry.note === 'string' ? entry.note : '';
    const version = typeof entry.version === 'string' ? entry.version : '';

    return version === '' ? note : `## ${version}\n\n${note}`;
}

/**
 * The notes of a feed as one Markdown text. A feed gives a string, or a list of one note per
 * version; anything else is no notes. The cap is the one the window enforces on the state.
 */
export function releaseNotesOf(raw: unknown): string | undefined {
    const text = Array.isArray(raw)
        ? raw
              .filter((entry): entry is ReleaseNote => typeof entry === 'object' && entry !== null)
              .map(noteOf)
              .join('\n\n')
        : raw;

    return typeof text === 'string' && text.trim() !== ''
        ? text.slice(0, UPDATE_NOTES_MAX)
        : undefined;
}

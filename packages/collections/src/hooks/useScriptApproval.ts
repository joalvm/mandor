import type { ScriptsApproveRequest, ScriptStatus } from '@mandor/ipc';
import { bridge, createPendingWrites, fireAndForget, onOriginLeft } from '@mandor/shell';
import { useLayoutEffect, useMemo, useRef, useState } from 'react';

/** Where a script sits: its workspace, its level and the moment of the send it runs at. */
export type ScriptPlace = Pick<ScriptsApproveRequest, 'event' | 'level' | 'workspaceId'>;

/** What an editor of scripts knows of its text, and what it does with a key or the button. */
export type ScriptApproval = {
    /** What main said of the text shown; `null` while it has not answered. */
    status: ScriptStatus | null;
    /** The button: the person approves the text as it is now. */
    approve: () => void;
    /** What the editor says changed; a text equal to the one it holds is a load, not a key. */
    typed: (next: string) => void;
};

type SetStatus = (status: ScriptStatus | null) => void;

/** The editor as the rules read it; one per hook, kept out of the render. */
type Editor = {
    key: string;
    place: ScriptPlace;
    text: string;
    /** Whether the text descends from one main approved, or from an empty one, by typing here. */
    trusted: boolean;
    ticket: number;
    setStatus: SetStatus;
};

type Asked = { request: ScriptsApproveRequest; generation: number };

type Answer = (generation: number, approved: boolean) => void;

/**
 * A minute. The pause decides nothing: main does, with the text before the burst. It only keeps a
 * script typed key by key from leaving a line in the store at every pause of the typing; what
 * runs before the pause settles it first (`settlePendingWrites`).
 */
const APPROVAL_PAUSE = 60_000;

/** Who listens to the answers of a key: two views of one request share it. */
const LISTENERS = new Map<string, Set<Answer>>();

/** Each key counts the texts that came from outside: an answer to an older one is ignored. */
const GENERATIONS = new Map<string, number>();

const approvals = createPendingWrites<string, Asked>(async (key, { generation, request }) => {
    const answer = await bridge.scripts.approve(request);
    const approved = answer.ok && answer.value.approved;

    for (const listener of LISTENERS.get(key) ?? []) {
        listener(generation, approved);
    }
}, APPROVAL_PAUSE);

onOriginLeft(() => {
    GENERATIONS.clear();
});

function generationOf(key: string): number {
    return GENERATIONS.get(key) ?? 0;
}

function askStatus(editor: Editor): void {
    editor.ticket += 1;

    const { key, place, text, ticket } = editor;
    const asked = bridge.scripts.status({ scripts: [{ ...place, source: text }] });

    fireAndForget(
        asked.then((answer) => {
            const known = answer.ok ? answer.value.statuses[0] : undefined;

            if (editor.ticket !== ticket || editor.key !== key || known === undefined) {
                return;
            }

            if (editor.text !== text) {
                askStatus(editor);

                return;
            }

            editor.trusted = known === 'approved' || text === '';
            editor.setStatus(known);
        }),
    );
}

/** The answer to a key typed: what it approved shows, and a refusal brings the band back. */
function answered(editor: Editor, generation: number, approved: boolean): void {
    if (generation !== generationOf(editor.key) || !editor.trusted) {
        return;
    }

    if (approved) {
        editor.setStatus('approved');

        return;
    }

    editor.trusted = false;
    approvals.cancel(editor.key);
    editor.setStatus('unapproved');
    askStatus(editor);
}

/**
 * A text the editor did not type: the first one, a reload from disk, a pull, another script.
 * Nothing typed before it may approve it, so what waited is dropped and main is asked again.
 * The one exception is the burst of this same key coming back to a view that closed meanwhile.
 */
function arrived(editor: Editor, key: string, source: string): void {
    const waiting = approvals.waiting(key);

    editor.key = key;
    editor.text = source;

    if (waiting?.request.source === source && waiting.generation === generationOf(key)) {
        editor.trusted = true;
        editor.setStatus('approved');

        return;
    }

    if (waiting !== undefined) {
        approvals.cancel(key);
        GENERATIONS.set(key, generationOf(key) + 1);
    }

    editor.trusted = false;
    editor.setStatus(null);
    askStatus(editor);
}

/**
 * A text replaced in an editor already open: what its own key waited for is dropped, and no
 * answer to it counts, whether the new text is another of the same script or another script.
 */
function replaced(editor: Editor, key: string, source: string): void {
    approvals.cancel(editor.key);
    GENERATIONS.set(editor.key, generationOf(editor.key) + 1);
    arrived(editor, key, source);
}

function typed(editor: Editor, next: string): void {
    const before = editor.text;

    if (next === before) {
        return;
    }

    editor.text = next;

    if (!editor.trusted) {
        return;
    }

    const burst = approvals.waiting(editor.key)?.request.previousSource ?? before;

    approvals.schedule(editor.key, {
        generation: generationOf(editor.key),
        request: { ...editor.place, source: next, previousSource: burst },
    });
    // The person's own typing draws no band: main still judges the burst before any send runs
    // it, and a refusal brings the band back.
    editor.setStatus('approved');
}

function approveShown(editor: Editor): void {
    const { key, text } = editor;
    const generation = generationOf(key);
    const asked = bridge.scripts.approve({ ...editor.place, source: text });

    fireAndForget(
        asked.then((answer) => {
            if (generation !== generationOf(key) || editor.key !== key) {
                return;
            }

            const approved = answer.ok && answer.value.approved;

            if (approved && editor.text === text) {
                editor.trusted = true;
                editor.setStatus('approved');

                return;
            }

            askStatus(editor);
        }),
    );
}

/**
 * The trust of the script an editor shows. Typing approves only over a text main approved, or an
 * empty one: main judges the text before the burst (`previousSource`) and can refuse. A text from
 * outside never approves by itself, and the band stays until the person presses the button.
 */
export function useScriptApproval(place: ScriptPlace, key: string, source: string): ScriptApproval {
    const [status, setStatus] = useState<ScriptStatus | null>(null);
    const editor = useRef<Editor | null>(null);
    const { event, level, workspaceId } = place;

    // Before the editor's own effects: a text set from outside reaches the editor as a change,
    // and by then the rules must already know it was not a key.
    useLayoutEffect(() => {
        const shown = editor.current;
        const here = { event, level, workspaceId };

        if (shown === null) {
            editor.current = {
                key,
                place: here,
                text: source,
                trusted: false,
                ticket: 0,
                setStatus,
            };
            arrived(editor.current, key, source);

            return;
        }

        shown.place = here;

        if (shown.key !== key || shown.text !== source) {
            replaced(shown, key, source);
        }
    }, [event, key, level, source, workspaceId]);

    useLayoutEffect(() => {
        const listeners = LISTENERS.get(key) ?? new Set<Answer>();
        const listener: Answer = (generation, approved) => {
            if (editor.current !== null) {
                answered(editor.current, generation, approved);
            }
        };

        listeners.add(listener);
        LISTENERS.set(key, listeners);

        return () => {
            listeners.delete(listener);

            if (listeners.size === 0) {
                LISTENERS.delete(key);
            }
        };
    }, [key]);

    return useMemo(
        () => ({
            status,
            approve: () => {
                if (editor.current !== null) {
                    approveShown(editor.current);
                }
            },
            typed: (next: string) => {
                if (editor.current !== null) {
                    typed(editor.current, next);
                }
            },
        }),
        [status],
    );
}

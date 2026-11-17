import type { ConflictChoice } from '@mandor/ipc';
import { scopeToOrigin } from '@mandor/shell';
import { createStore, type StoreApi } from 'zustand/vanilla';

/** The answers of one tab, keyed by the id of each question. */
export type ConflictChoices = Readonly<Record<string, ConflictChoice>>;

type LeaveAnswer = (leave: boolean) => void;

type ConflictDrafts = {
    /** The answers each tab has so far, filed under the id of the tab. They live in the window only. */
    choices: Record<string, ConflictChoices>;
    /** The tabs whose closing waits for a word, each with the way to give it. */
    closing: Record<string, LeaveAnswer>;
    /** Gives the leave an answer: true lets the tab go, false keeps it. */
    answerLeave: (tabId: string, leave: boolean) => void;
    /** Resolves once the person says whether the tab may go; at once when nothing would be lost. */
    askToLeave: (tabId: string) => Promise<boolean>;
    /** Writes one answer, replacing the one the question had. */
    choose: (tabId: string, itemId: string, choice: ConflictChoice) => void;
    /** Takes back the answer of one question, which goes back to waiting. */
    clear: (tabId: string, itemId: string) => void;
    /** Lets go of everything a tab had answered; a leave still waiting is told to stay. */
    discard: (tabId: string) => void;
    /** Whether the tab has anything answered that closing it would lose. */
    hasDraft: (tabId: string) => boolean;
};

export type ConflictDraftsApi = StoreApi<ConflictDrafts>;

/** Which side an answer took, or nothing when it was a text the person wrote or no answer yet. */
export function pickOf(choice: ConflictChoice | undefined): 'ours' | 'theirs' | null {
    return choice !== undefined && 'pick' in choice ? choice.pick : null;
}

function without<Value>(
    record: Readonly<Record<string, Value>>,
    key: string,
): Record<string, Value> {
    return Object.fromEntries(Object.entries(record).filter(([each]) => each !== key));
}

export const conflictDrafts: ConflictDraftsApi = scopeToOrigin(
    createStore<ConflictDrafts>()((set, get) => ({
        answerLeave: (tabId, leave) => {
            const answer = get().closing[tabId];

            set((state) => ({ closing: without(state.closing, tabId) }));
            answer?.(leave);
        },
        askToLeave: (tabId) => {
            if (!get().hasDraft(tabId)) {
                return Promise.resolve(true);
            }

            return new Promise<boolean>((resolve) => {
                const earlier = get().closing[tabId];

                // A second ask while the first waits is the same question: both hear the one answer.
                set((state) => ({
                    closing: {
                        ...state.closing,
                        [tabId]: (leave) => {
                            earlier?.(leave);
                            resolve(leave);
                        },
                    },
                }));
            });
        },
        choices: {},
        choose: (tabId, itemId, choice) => {
            set((state) => ({
                choices: {
                    ...state.choices,
                    [tabId]: { ...state.choices[tabId], [itemId]: choice },
                },
            }));
        },
        clear: (tabId, itemId) => {
            set((state) => ({
                choices: { ...state.choices, [tabId]: without(state.choices[tabId] ?? {}, itemId) },
            }));
        },
        closing: {},
        discard: (tabId) => {
            get().closing[tabId]?.(false);
            set((state) => ({
                choices: without(state.choices, tabId),
                closing: without(state.closing, tabId),
            }));
        },
        hasDraft: (tabId) => Object.keys(get().choices[tabId] ?? {}).length > 0,
    })),
);

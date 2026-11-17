import { envStore } from '@mandor/env';
import type { RequestScriptOutput } from '@mandor/ipc';
import { scopeToOrigin } from '@mandor/shell';
import { createStore, type StoreApi } from 'zustand/vanilla';

import { syncBridge } from '../../../app/sync-bridge.js';
import { joinedScriptOutput, type ScriptOutput } from '../../../response/lib/script-output.js';
import { requestsStore } from '../requests-store.js';
import type { SendEntry } from '../responses.slice.js';

/**
 * The workspace and the environment a send resolved in, where what its scripts set lands, and
 * the heading its lines carry in the console of the window.
 */
type SendPlace = { workspaceId: string; environmentId: string; title: string };

type ScriptRun = {
    place: SendPlace;
    /** Nothing until the first moment of the send is told. */
    output?: ScriptOutput | undefined;
    bytes: number;
    /** When it was last told something, to know which output is the oldest. */
    told: number;
};

type ScriptOutputState = {
    runs: Record<string, ScriptRun>;
    /** The place of every send told lately, even one left behind: a late push still sets values. */
    places: Record<string, SendPlace>;
};

type ScriptOutputActions = {
    /** A send is leaving: its pushes are kept from now on. */
    expect: (sendId: string, place: SendPlace) => void;
    receive: (push: RequestScriptOutput) => void;
    /** Lets go of every send no resource shows any more. */
    keep: (sendIds: ReadonlySet<string>) => void;
    reset: () => void;
};

type ScriptOutputStore = ScriptOutputActions & ScriptOutputState;

/** What every output of the window may weigh together, in bytes of the window's strings. */
export const SCRIPT_OUTPUT_BYTES = 8 * 1024 * 1024;

/** How many sends are remembered by their place, for a push that arrives after its output went. */
const KNOWN_PLACES = 64;

let told = 0;

/** A string of the window holds two bytes a character. */
function weightOf(push: RequestScriptOutput): number {
    return JSON.stringify(push).length * 2;
}

/** The oldest outputs go first, never the one just told, until all of them fit under the ceiling. */
function underCeiling(runs: Record<string, ScriptRun>, newest: string): Record<string, ScriptRun> {
    const oldest = Object.entries(runs)
        .filter(([sendId]) => sendId !== newest)
        .sort(([, one], [, other]) => one.told - other.told);
    const gone = new Set<string>();
    let total = Object.values(runs).reduce((sum, run) => sum + run.bytes, 0);

    for (const [sendId, run] of oldest) {
        if (total <= SCRIPT_OUTPUT_BYTES) {
            break;
        }

        total -= run.bytes;
        gone.add(sendId);
    }

    return gone.size === 0
        ? runs
        : Object.fromEntries(Object.entries(runs).filter(([sendId]) => !gone.has(sendId)));
}

/** What a push of a send set, shown where the send resolved, whether its output is kept or not. */
function showVariables(place: SendPlace | undefined, push: RequestScriptOutput): void {
    if (place !== undefined) {
        envStore
            .getState()
            .showScriptVariables(place.workspaceId, place.environmentId, push.variables);
    }
}

function lastPlaces(places: Record<string, SendPlace>): Record<string, SendPlace> {
    return Object.fromEntries(Object.entries(places).slice(-KNOWN_PLACES));
}

function actionsFor(
    set: StoreApi<ScriptOutputStore>['setState'],
    get: () => ScriptOutputStore,
): ScriptOutputActions {
    return {
        expect: (sendId, place) => {
            set((state) => ({
                runs: { ...state.runs, [sendId]: { place, bytes: 0, told: (told += 1) } },
                places: lastPlaces({ ...state.places, [sendId]: place }),
            }));
        },
        receive: (push) => {
            showVariables(get().places[push.sendId], push);
            set((state) => {
                const run = state.runs[push.sendId];

                if (run === undefined) {
                    return state;
                }

                const grown = {
                    place: run.place,
                    output: joinedScriptOutput(run.output, push),
                    bytes: run.bytes + weightOf(push),
                    told: (told += 1),
                };

                return { runs: underCeiling({ ...state.runs, [push.sendId]: grown }, push.sendId) };
            });
        },
        keep: (sendIds) => {
            set((state) => {
                const kept = Object.entries(state.runs).filter(([sendId]) => sendIds.has(sendId));

                return kept.length === Object.keys(state.runs).length
                    ? state
                    : { runs: Object.fromEntries(kept) };
            });
        },
        reset: () => {
            set({ runs: {}, places: {} });
        },
    };
}

/**
 * What the scripts of the sends said, by the id of each send: a resource reads the one of its
 * last send, and a send no resource shows any more is let go. It holds text a script wrote, so
 * every output of the window together stays under a ceiling.
 */
export const scriptOutputStore = scopeToOrigin(
    createStore<ScriptOutputStore>()((set, get) => ({
        runs: {},
        places: {},
        ...actionsFor(set, get),
    })),
);

function sendIdOf(entry: SendEntry): string[] {
    const sendId = 'sendId' in entry ? entry.sendId : undefined;

    return sendId === undefined ? [] : [sendId];
}

/**
 * Hears what main pushes of the scripts of every send, and lets the output of a send go once no
 * resource shows it. Mounted once by the window; gives back the way to stop.
 */
export function followScriptOutput(): () => void {
    const stops = [
        syncBridge.request.onScriptOutput((push) => {
            scriptOutputStore.getState().receive(push);
        }),
        requestsStore.subscribe((state) => {
            scriptOutputStore
                .getState()
                .keep(new Set(Object.values(state.sends).flatMap(sendIdOf)));
        }),
    ];

    return () => {
        for (const stop of stops) {
            stop();
        }
    };
}

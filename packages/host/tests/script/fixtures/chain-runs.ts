import type { ScriptEffect } from '@mandor/script';

import type { ChainEntry } from '../../../src/script/chain-entries.js';
import type { ChainDeps, ChainRun, ChainSnapshot } from '../../../src/script/run-chain.js';
import { createScriptVariables } from '../../../src/script/script-variables.js';
import type { ScriptSender } from '../../../src/script/script-send.js';
import { startInProcessScriptWorker } from '../../../src/testing/in-process-script-worker.js';

export const PLACE = { origin: 'local', workspaceId: 'ws', environmentId: null };

/** A script of the request, approved or not by the deps it runs with. */
export function script(source: string, name = 'Orders'): ChainEntry {
    return { level: 'folder', name, event: 'onBeforeRequest', source };
}

/** What the next script sees: the photo with what this one set on top. */
function advance(snapshot: ChainSnapshot, effects: readonly ScriptEffect[]): ChainSnapshot {
    const sets = effects
        .filter((effect): effect is Extract<ScriptEffect, { kind: 'var' }> => effect.kind === 'var')
        .map(({ name, value }) => ({ name, value }));
    const kept = snapshot.variables.filter(({ name }) => !sets.some((set) => set.name === name));

    return { ...snapshot, variables: [...kept, ...sets] };
}

export function runOf(
    entries: ChainEntry[],
    extra: { signal?: AbortSignal; send?: ScriptSender } = {},
): ChainRun {
    return {
        entries,
        snapshot: { variables: [] },
        advance,
        signal: extra.signal ?? new AbortController().signal,
        place: PLACE,
        send: extra.send,
    };
}

export type ChainSpy = ChainDeps & { lines: [string, string][]; started: () => number };

/** Every script approved, the switch on, and the real engine with no thread. */
export function depsOf(overrides: Partial<ChainDeps> = {}): ChainSpy {
    const lines: [string, string][] = [];
    let started = 0;

    return {
        approvals: { isApproved: () => Promise.resolve(true) },
        scriptsSwitch: { enabled: () => true },
        variables: createScriptVariables(),
        startChain: (options) => {
            started += 1;

            return startInProcessScriptWorker(options);
        },
        logger: {
            log: (level, message) => {
                lines.push([level, message]);
            },
        },
        ...overrides,
        lines,
        started: () => started,
    };
}

/** A send main holds until the test lets it go, and the signal it was given. */
export function heldSend() {
    const held: { signal?: AbortSignal; answer?: (text: string) => void } = {};
    const asked = Promise.withResolvers<undefined>();
    const send: ScriptSender = (_payload, signal) =>
        new Promise<string>((resolve) => {
            held.signal = signal;
            held.answer = resolve;
            signal.addEventListener('abort', () => {
                resolve(JSON.stringify({ ok: false, message: 'cancelled' }));
            });
            asked.resolve(undefined);
        });

    return { send, held, asked: asked.promise };
}

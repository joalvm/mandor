import { scriptNotice, type ScriptNotice } from '@mandor/schema';

import { API_BY_EVENT, type RequestField } from '../api/script-api.js';
import type { ScriptEffect, ScriptRunInput } from './script-run.js';

type EffectKind = ScriptEffect['kind'];

/** The effect a write to each part of `request` leaves. */
const KIND_OF_WRITE: Record<RequestField, EffectKind> = {
    url: 'url',
    method: 'method',
    query: 'query',
    headers: 'header',
    body: 'body',
};

/** What a script of the event may ask for, read from the one table of the API. */
function kindsOf(event: ScriptRunInput['event']): ReadonlySet<EffectKind> {
    const { members, requestWrites } = API_BY_EVENT[event];
    const kinds = new Set<EffectKind>(['var', ...requestWrites.map((part) => KIND_OF_WRITE[part])]);

    if (members.includes('socket')) {
        kinds.add('socket');
    }

    return kinds;
}

/**
 * The effects the API of the event can write, each other one dropped with a note. The guest only
 * offers what the event allows, but a script can forge the text the guest hands back (by closing
 * the function it is wrapped in, or with a `toJSON` of its own), so main decides it again here.
 */
export function effectsTheEventAllows(
    effects: readonly ScriptEffect[],
    event: ScriptRunInput['event'],
): { effects: ScriptEffect[]; notes: ScriptNotice[] } {
    const kinds = kindsOf(event);
    const kept = effects.filter(({ kind }) => kinds.has(kind));
    const notes = effects
        .filter(({ kind }) => !kinds.has(kind))
        .map(({ kind }) => scriptNotice('effect-not-in-event', { event, kind }));

    return { effects: kept, notes };
}

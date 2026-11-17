import type { ChainResult, ChainSnapshot } from '@mandor/host';
import type { WsOpenRequest } from '@mandor/ipc';

type ScriptEffect = ChainResult['effects'][number];

type EffectOf<K extends ScriptEffect['kind']> = Extract<ScriptEffect, { kind: K }>;

/** The handshake as the window sent it: the url, the headers by name, the params as lines. */
export type ConnectionTemplate = WsOpenRequest['template'];

type ParamLine = NonNullable<ConnectionTemplate['params']>[number];

/** What scripts wrote of a handshake: the headers by name, the params by the very line they are. */
type WrittenHandshake = {
    url: boolean;
    /** Names, in lowercase, of the headers a script set. */
    headers: Set<string>;
    /** A line is known by identity: a delete before it moves the indexes. */
    params: Set<ParamLine>;
    /** How many headers and params a script took out. */
    deletes: number;
};

/** The handshake after the effects of its scripts, and what main must know of how it got there. */
export type AppliedTemplate = {
    template: ConnectionTemplate;
    written: WrittenHandshake;
    /** A script set or deleted `Host`: the destination is no longer the one the person chose. */
    wroteHost: boolean;
};

type LineEffect = EffectOf<'header'> | EffectOf<'query'>;

function withoutHeader(headers: Record<string, string>, name: string): Record<string, string> {
    return Object.fromEntries(
        Object.entries(headers).filter(([kept]) => kept.toLowerCase() !== name),
    );
}

/** A header set replaces every one of its name, in any case, and keeps the case it was written in. */
function applyHeader(state: AppliedTemplate, effect: EffectOf<'header'>): void {
    const name = effect.name.toLowerCase();
    const headers = state.template.headers ?? {};
    const kept = withoutHeader(headers, name);

    state.wroteHost ||= name === 'host';

    if (effect.op === 'delete') {
        state.template = { ...state.template, headers: kept };
        state.written.deletes += 1;
        state.written.headers.delete(name);

        return;
    }

    const written = Object.keys(headers).find((key) => key.toLowerCase() === name) ?? effect.name;

    state.template = { ...state.template, headers: { ...kept, [written]: effect.value ?? '' } };
    state.written.headers.add(name);
}

function sameParam(name: string): (line: ParamLine) => boolean {
    return (line) => line.enabled && line.key === name;
}

/** A query line set replaces the ones of its name or comes last; a delete takes them out. */
function applyQuery(state: AppliedTemplate, effect: LineEffect): void {
    const same = sameParam(effect.name);
    const kept = (state.template.params ?? []).filter((line) => !same(line));

    if (effect.op === 'delete') {
        state.template = { ...state.template, params: kept };
        state.written.deletes += 1;

        return;
    }

    const line: ParamLine = { key: effect.name, value: effect.value ?? '', enabled: true };

    state.template = { ...state.template, params: [...kept, line] };
    state.written.params.add(line);
}

/** What each effect does to the handshake; the event already dropped what it may not write. */
const APPLY: {
    [K in ScriptEffect['kind']]: (state: AppliedTemplate, effect: EffectOf<K>) => void;
} = {
    var: () => undefined,
    socket: () => undefined,
    method: () => undefined,
    body: () => undefined,
    header: applyHeader,
    query: applyQuery,
    url: (state, effect) => {
        state.template = { ...state.template, url: effect.value };
        state.written.url = true;
    },
};

function applyOne<K extends ScriptEffect['kind']>(
    state: AppliedTemplate,
    kind: K,
    effect: EffectOf<K>,
): void {
    APPLY[kind](state, effect);
}

/** The handshake as the window sent it, with nothing written. */
export function untouched(template: ConnectionTemplate): AppliedTemplate {
    return {
        template,
        written: { url: false, headers: new Set(), params: new Set(), deletes: 0 },
        wroteHost: false,
    };
}

/** The effects of a chain on the handshake, in the order the scripts asked. */
export function applyConnectionEffects(
    template: ConnectionTemplate,
    effects: readonly ScriptEffect[],
): AppliedTemplate {
    const state = untouched(template);

    for (const effect of effects) {
        applyOne(state, effect.kind, effect);
    }

    return state;
}

/** Whether a script wrote anything of the handshake at all. */
export function wroteHandshake(applied: AppliedTemplate): boolean {
    const { url, headers, params, deletes } = applied.written;

    return url || headers.size > 0 || params.size > 0 || deletes > 0 || applied.wroteHost;
}

/**
 * The keys of the templates of the open a script wrote: a header by its name, a param line by
 * where it stands now, so a delete before it moves nothing.
 */
export function writtenKeys(applied: AppliedTemplate): Set<string> {
    const { template, written } = applied;
    const headers = Object.keys(template.headers ?? {})
        .filter((name) => written.headers.has(name.toLowerCase()))
        .map((name) => `header:${name}`);
    const params = (template.params ?? []).flatMap((line, index) =>
        written.params.has(line)
            ? [`param:${String(index)}:key`, `param:${String(index)}:value`]
            : [],
    );

    return new Set([...(written.url ? ['url'] : []), ...headers, ...params]);
}

/**
 * The handshake as a script sees it: the templates as written, `{{var}}` literal, the GET of an
 * upgrade, and no auth and no subprotocols.
 */
export function handshakePhoto(
    template: ConnectionTemplate,
): NonNullable<ChainSnapshot['request']> {
    return {
        url: template.url,
        method: 'GET',
        headers: Object.entries(template.headers ?? {})
            .filter(([name]) => name !== '')
            .map(([name, value]) => ({ name, value })),
        query: (template.params ?? [])
            .filter((line) => line.enabled && line.key !== '')
            .map((line) => ({ name: line.key, value: line.value })),
    };
}

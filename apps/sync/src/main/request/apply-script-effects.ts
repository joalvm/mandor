import type { ChainResult } from '@mandor/host';
import {
    scriptNotice,
    type ChainLog,
    type RequestBody,
    type RequestItem,
    type RequestLine,
} from '@mandor/schema';

type ScriptEffect = ChainResult['effects'][number];

type EffectOf<K extends ScriptEffect['kind']> = Extract<ScriptEffect, { kind: K }>;

/** What scripts wrote of a request: the fields by name, the lines by the very object they are. */
export type WrittenParts = {
    fields: Set<'url' | 'method' | 'body'>;
    /** A line is known by identity: the list sent mixes inherited lines, and a delete moves indexes. */
    lines: Set<RequestLine>;
};

/** The request after the effects of its scripts, and what main must know of how it got there. */
export type AppliedEffects = {
    request: RequestItem;
    written: WrittenParts;
    /** Names, in lowercase, of the headers a script deleted: they leave the inherited lines too. */
    droppedHeaders: Set<string>;
    /** A script set or deleted `Host`: the destination is no longer the one the person chose. */
    wroteHost: boolean;
    /** What main refused to write, said in the console. */
    logs: ChainLog[];
};

type LineList = 'headers' | 'query';

/** The bodies a script may write: the ones that are text, and none, which becomes text. */
const WRITABLE_BODIES: ReadonlySet<RequestBody['type']> = new Set(['json', 'text', 'xml', 'none']);

/** How each list matches a name: headers in any case, query lines as written. */
const SAME_NAME: Record<LineList, (line: RequestLine, name: string) => boolean> = {
    headers: (line, name) => line.key.toLowerCase() === name.toLowerCase(),
    query: (line, name) => line.key === name,
};

function setLine(state: AppliedEffects, list: LineList, name: string, value: string): void {
    const same = (line: RequestLine): boolean => line.enabled && SAME_NAME[list](line, name);
    const lines = state.request[list];
    const line: RequestLine = { key: lines.find(same)?.key ?? name, value, enabled: true };

    state.request = { ...state.request, [list]: [...lines.filter((kept) => !same(kept)), line] };
    state.written.lines.add(line);
}

function deleteLine(state: AppliedEffects, list: LineList, name: string): void {
    const lines = state.request[list];

    state.request = {
        ...state.request,
        [list]: lines.filter((line) => !(line.enabled && SAME_NAME[list](line, name))),
    };
}

type LineEffect = EffectOf<'header'> | EffectOf<'query'>;

/** What `set` and `delete` do to a list of lines. */
const LINE_OP: Record<
    LineEffect['op'],
    (state: AppliedEffects, list: LineList, effect: LineEffect) => void
> = {
    set: (state, list, effect) => {
        setLine(state, list, effect.name, effect.value ?? '');
    },
    delete: (state, list, effect) => {
        deleteLine(state, list, effect.name);
    },
};

/** A header a script deleted leaves the inherited lines too, until a script sets it again. */
const DROPPED: Record<LineEffect['op'], (dropped: Set<string>, name: string) => void> = {
    set: (dropped, name) => {
        dropped.delete(name);
    },
    delete: (dropped, name) => {
        dropped.add(name);
    },
};

function applyHeader(state: AppliedEffects, effect: EffectOf<'header'>): void {
    const name = effect.name.toLowerCase();

    LINE_OP[effect.op](state, 'headers', { ...effect, name });
    DROPPED[effect.op](state.droppedHeaders, name);
    state.wroteHost ||= name === 'host';
}

function applyBody(state: AppliedEffects, effect: EffectOf<'body'>): void {
    const { type } = state.request.body;

    if (!WRITABLE_BODIES.has(type)) {
        state.logs.push(scriptNotice('body-not-writable', { type }));

        return;
    }

    state.request = { ...state.request, body: { type: effect.type, content: effect.value } };
    state.written.fields.add('body');
}

/** What each effect does to the request; a variable and a socket frame are not its business. */
const APPLY: { [K in ScriptEffect['kind']]: (state: AppliedEffects, effect: EffectOf<K>) => void } =
    {
        var: () => undefined,
        socket: () => undefined,
        header: applyHeader,
        query: (state, effect) => {
            LINE_OP[effect.op](state, 'query', effect);
        },
        url: (state, effect) => {
            state.request = { ...state.request, url: effect.value };
            state.written.fields.add('url');
        },
        method: (state, effect) => {
            state.request = { ...state.request, method: effect.value };
            state.written.fields.add('method');
        },
        body: applyBody,
    };

function applyOne<K extends ScriptEffect['kind']>(
    state: AppliedEffects,
    kind: K,
    effect: EffectOf<K>,
): void {
    APPLY[kind](state, effect);
}

/** The request as the window sent it, with nothing written. */
export function noEffects(request: RequestItem): AppliedEffects {
    return {
        request,
        written: { fields: new Set(), lines: new Set() },
        droppedHeaders: new Set(),
        wroteHost: false,
        logs: [],
    };
}

/** Whether a script wrote anything of the request at all. */
export function wroteAny(applied: AppliedEffects): boolean {
    const { written, droppedHeaders, wroteHost } = applied;

    return (
        written.fields.size > 0 || written.lines.size > 0 || droppedHeaders.size > 0 || wroteHost
    );
}

/**
 * The effects of a chain on the request, in the order the scripts asked. `set` replaces the lines
 * of the request with that name or adds one; over an inherited header it adds a line of the
 * request, which wins by name. `delete` takes the lines of the request out, and an inherited
 * header leaves through `droppedHeaders`. A body is written only when it is text: a script never
 * names a file, and never touches the auth or the settings.
 */
export function applyScriptEffects(
    request: RequestItem,
    effects: readonly ScriptEffect[],
): AppliedEffects {
    const state = noEffects(request);

    for (const effect of effects) {
        applyOne(state, effect.kind, effect);
    }

    return state;
}

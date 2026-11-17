import { variableScopeOf, type EnvironmentScope } from '@mandor/host';
import type { RequestItem, RequestLine } from '@mandor/schema';
import {
    answerSpellings,
    resolveTemplates,
    resolveText,
    scriptGuard,
    type VariableScope,
} from '@mandor/vars';

import { wroteAny, type AppliedEffects, type WrittenParts } from './apply-script-effects.js';

type ResolveTemplatesResult = ReturnType<typeof resolveTemplates>;

/** What a send that may have run scripts brings to its resolution. */
export type SendGuard = {
    /** The disk as the scripts saw it, read once for scripts, variables, headers and auth. */
    scope: EnvironmentScope;
    /** What scripts set in the place of the send: the level above every other. */
    script: Readonly<Record<string, string>>;
    /** The request as the window sent it, before any script. */
    base: RequestItem;
    applied: AppliedEffects;
};

/** What the rule of destination decided of one send. */
type GuardVerdict = {
    /** The fields that resolve with secrets off: the ones a script wrote, or all of them. */
    fieldsOff: (field: string) => boolean;
    /** The destination moved: nothing secret goes out, the auth neither. */
    sendOff: boolean;
    influenced: boolean;
    destinationMoved: boolean;
    /** Secret names left as `{{name}}`. */
    withheld: string[];
};

/** What a hop to another origin must not take of a send a script shaped. */
type GuardedSecrets = {
    /** Resolved names of the header lines that carry a secret. */
    headers: string[];
    bodySecret: boolean;
    spellings: string[];
};

/** What the rule of destination decided of a send, and what of it a redirect must not carry. */
export type GuardedRequest = Pick<GuardVerdict, 'influenced' | 'destinationMoved' | 'withheld'> &
    GuardedSecrets;

export type GuardedTemplates = {
    resolved: ResolveTemplatesResult;
    verdict: GuardVerdict;
    secrets: GuardedSecrets;
};

type Field = WrittenParts['fields'] extends Set<infer F> ? F : never;

/** The template each written field resolves in; the method has none. */
const KEY_OF_FIELD: Record<Field, string | undefined> = {
    url: 'url',
    body: 'body',
    method: undefined,
};

const BODY_KEY = /^(?:body|field:|graphql:)/u;

/** A header line, by its name or its value: either may carry the secret. */
const HEADER_LINE = /^header:(\d+):(?:key|value)$/u;

function lineKeys(prefix: string, lines: readonly RequestLine[], written: Set<RequestLine>) {
    return lines.flatMap((line, index) =>
        written.has(line)
            ? [`${prefix}:${String(index)}:key`, `${prefix}:${String(index)}:value`]
            : [],
    );
}

/**
 * The keys of `requestTemplates` a script wrote, on the lists that are sent: a line is found by
 * identity, so an inherited line in front of it or a delete before it moves nothing.
 */
function writtenKeys(applied: AppliedEffects, sent: readonly RequestLine[]): Set<string> {
    const { fields, lines } = applied.written;

    return new Set([
        ...[...fields].flatMap((field) => KEY_OF_FIELD[field] ?? []),
        ...lineKeys('header', sent, lines),
        ...lineKeys('query', applied.request.query, lines),
    ]);
}

/** The `Host` line resolves to another value once the script level takes part. */
function hostMoved(sent: readonly RequestLine[], base: VariableScope, scope: VariableScope) {
    const host = sent.find((line) => line.enabled && line.key.toLowerCase() === 'host');

    return (
        host !== undefined &&
        resolveText(host.value, base).text !== resolveText(host.value, scope).text
    );
}

/** The keys whose text, as it resolves, carries a secret. */
function secretKeys(
    templates: Record<string, string>,
    scope: VariableScope,
    off: (field: string) => boolean,
): string[] {
    return Object.entries(templates)
        .filter(([key, template]) => {
            const resolved = resolveText(template, scope, off(key) ? { secrets: 'off' } : {});

            return resolved.used.some((used) => used.secret);
        })
        .map(([key]) => key);
}

/** The resolved names of the header lines whose name or value carries a secret, once each. */
function headerNames(keys: readonly string[], resolved: ResolveTemplatesResult): string[] {
    const lines = keys.flatMap((key) => HEADER_LINE.exec(key)?.[1] ?? []);

    return [...new Set(lines)].map((index) => resolved.values[`header:${index}:key`] ?? '');
}

function secretsOf(
    guard: SendGuard,
    templates: Record<string, string>,
    resolved: ResolveTemplatesResult,
    verdict: GuardVerdict,
): GuardedSecrets {
    const keys =
        verdict.influenced && !verdict.sendOff
            ? secretKeys(templates, variableScopeOf(guard.scope, guard.script), verdict.fieldsOff)
            : [];
    const { secrets, globals } = guard.scope;

    return {
        headers: headerNames(keys, resolved),
        bodySecret: keys.some((key) => BODY_KEY.test(key)),
        // Every secret of the place, not only the ones the request named: a hop whose address
        // spells one of them is held either way.
        spellings: answerSpellings(Object.values({ ...globals.secrets, ...secrets })),
    };
}

/**
 * The rule both scripts and person live by in a send. With no value of a script and nothing
 * written, the send resolves as it always did. Otherwise a field a script wrote resolves with
 * secrets off, and when the destination moved —the origin of the request as written is not the
 * one that goes out, or a script touched `Host`— the whole send does: a host a script chose
 * receives no secret.
 */
export function guardedResolution(
    guard: SendGuard,
    templates: Record<string, string>,
    sent: readonly RequestLine[],
): GuardedTemplates {
    const scope = variableScopeOf(guard.scope, guard.script);
    const written = wroteAny(guard.applied);

    if (!written && Object.keys(guard.script).length === 0) {
        const resolved = resolveTemplates(templates, scope);
        const verdict = {
            fieldsOff: () => false,
            sendOff: false,
            influenced: false,
            destinationMoved: false,
            withheld: [],
        };

        return { resolved, verdict, secrets: { headers: [], bodySecret: false, spellings: [] } };
    }

    const base = variableScopeOf(guard.scope);
    const keys = writtenKeys(guard.applied, sent);
    const fieldsOff = (field: string): boolean => keys.has(field);
    const first = resolveTemplates(templates, scope, { secretsOff: fieldsOff });
    const { influenced, destinationMoved } = scriptGuard({
        base: resolveText(guard.base.url, base).text,
        final: first.values['url'] ?? '',
        wroteHost: guard.applied.wroteHost,
        hostMoved: hostMoved(sent, base, scope),
        written,
        used: first.used,
    });
    const resolved = destinationMoved
        ? resolveTemplates(templates, scope, { secretsOff: () => true })
        : first;
    const verdict: GuardVerdict = {
        fieldsOff: destinationMoved ? () => true : fieldsOff,
        sendOff: destinationMoved,
        influenced,
        destinationMoved,
        withheld: resolved.withheld ?? [],
    };

    return { resolved, verdict, secrets: secretsOf(guard, templates, resolved, verdict) };
}

/** The verdict a send carries to the wire; the lines of an auth that carries a secret count too. */
export function guardedRequest(
    guarded: GuardedTemplates,
    authHeaders: readonly string[],
): GuardedRequest {
    const { influenced, destinationMoved, withheld } = guarded.verdict;

    return {
        influenced,
        destinationMoved,
        withheld,
        ...guarded.secrets,
        headers: [...guarded.secrets.headers, ...authHeaders],
    };
}

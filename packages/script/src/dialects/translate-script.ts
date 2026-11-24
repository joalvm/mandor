import {
    parse,
    type AnyNode,
    type CallExpression,
    type Function,
    type Identifier,
    type Program,
} from 'acorn';
import { ancestor, full } from 'acorn-walk';
import MagicString from 'magic-string';

import { BRUNO_DIALECT } from './bruno-dialect.js';
import type {
    DialectRule,
    DialectTable,
    ForeignMatch,
    ForeignUse,
    ScriptEdit,
    ScriptRange,
} from './dialect.js';
import { INSOMNIA_DIALECT } from './insomnia-dialect.js';
import { POSTMAN_DIALECT } from './postman-dialect.js';

const TABLES: readonly DialectTable[] = [POSTMAN_DIALECT, INSOMNIA_DIALECT, BRUNO_DIALECT];

/** Each root another app names its API under, with the table that reads it. */
const TABLE_OF_ROOT = new Map(
    TABLES.flatMap((table) => table.roots.map((root) => [root, table] as const)),
);

/** What a script gives once the bulb went over it. */
export type ScriptTranslation = {
    /** Whether the script parsed. One that does not is left as it came. */
    parsed: boolean;
    /** The script with every use the tables know written in `mandor.`. */
    text: string;
    /** The replacements, in the offsets of the script as it came, none over another. */
    edits: readonly ScriptEdit[];
    /** The uses of another app that stay as they were, and stay marked. */
    untranslated: readonly ForeignUse[];
};

type Found = ForeignUse & { edits: readonly ScriptEdit[] | undefined };

/** One name along the chain a root starts: `pm`, `pm.response`, `pm.response.code`. */
type Link = { at: number; node: AnyNode; path: string };

/** The names along a chain, and the last of them. */
type Chain = { end: Link; links: readonly Link[] };

/** A script reads like the body of an async function: it may `return`, and `await` at its top. */
function programOf(source: string): Program | undefined {
    try {
        return parse(source, {
            allowAwaitOutsideFunction: true,
            allowReturnOutsideFunction: true,
            ecmaVersion: 'latest',
        });
    } catch {
        return undefined;
    }
}

/** Every name the script declares, anywhere in it: a root it declares is its own, never another app's. */
function declaredIn(program: Program): Set<string> {
    const names = new Set<string>();

    full(program, (node, _state, type) => {
        if (type === 'VariablePattern' && node.type === 'Identifier') {
            names.add(node.name);
        }
    });

    return names;
}

/** The member a link is followed by, read as `.name`: a computed one is no name to look up. */
function nextLink(ancestors: readonly AnyNode[], { at, path }: Link): Link | undefined {
    const holder = ancestors[at - 1];

    if (holder?.type !== 'MemberExpression' || holder.object !== ancestors[at]) {
        return undefined;
    }

    if (holder.computed || holder.property.type !== 'Identifier') {
        return undefined;
    }

    return { at: at - 1, node: holder, path: `${path}.${holder.property.name}` };
}

function chainOf(ancestors: readonly AnyNode[], root: Identifier): Chain {
    let end: Link = { at: ancestors.length - 1, node: root, path: root.name };
    const links = [end];

    for (let next = nextLink(ancestors, end); next !== undefined; next = nextLink(ancestors, end)) {
        end = next;
        links.push(next);
    }

    return { end, links };
}

function callOf(named: AnyNode, holder: AnyNode | undefined): CallExpression | undefined {
    if (holder?.type !== 'CallExpression' || holder.callee !== named) {
        return undefined;
    }

    return holder;
}

function isFunction(node: AnyNode): node is AnyNode & Function {
    return (
        node.type === 'FunctionDeclaration' ||
        node.type === 'FunctionExpression' ||
        node.type === 'ArrowFunctionExpression'
    );
}

/** Whether the value of a call is awaited, or read on: `await x`, `x.then`. */
function readsOn(call: CallExpression, outer: AnyNode | undefined): boolean {
    return (
        outer?.type === 'AwaitExpression' ||
        (outer?.type === 'MemberExpression' && outer.object === call)
    );
}

function matchAt(
    ancestors: readonly AnyNode[],
    { at, node: named }: Link,
    continued: boolean,
): ForeignMatch {
    const call = callOf(named, ancestors[at - 1]);
    const inner = ancestors.slice(0, at).findLast(isFunction);

    return {
        awaitable: inner === undefined || inner.async,
        awaited: call !== undefined && readsOn(call, ancestors[at - 2]),
        call,
        continued,
        named,
    };
}

/** `{ test }`: a name that is also the key of an object cannot be written otherwise in place. */
function isKeyToo(ancestors: readonly AnyNode[]): boolean {
    const holder = ancestors.at(-2);

    return holder?.type === 'Property' && holder.shorthand;
}

/** The longest name of the chain the table knows, with its rule. */
function knownIn(
    table: DialectTable,
    links: readonly Link[],
): { link: Link; rule: DialectRule } | undefined {
    return links
        .map((link) => ({ link, rule: table.rules.get(link.path) }))
        .findLast((each): each is { link: Link; rule: DialectRule } => each.rule !== undefined);
}

function foundAt(table: DialectTable, root: Identifier, ancestors: readonly AnyNode[]): Found {
    const { end, links } = chainOf(ancestors, root);
    const known = isKeyToo(ancestors) ? undefined : knownIn(table, links);
    const edits = known?.rule(matchAt(ancestors, known.link, known.link !== end));

    return {
        dialect: table.dialect,
        edits,
        from: root.start,
        to: end.node.end,
        translatable: edits !== undefined,
    };
}

/** Every use of another app's API in the script: a root it does not declare, and the chain it starts. */
function usesIn(program: Program): Found[] {
    const declared = declaredIn(program);
    const found: Found[] = [];

    ancestor(program, {
        Identifier: (node, _state, ancestors) => {
            const table = TABLE_OF_ROOT.get(node.name);

            if (table !== undefined && !declared.has(node.name)) {
                found.push(foundAt(table, node, ancestors));
            }
        },
    });

    return found;
}

function shown({ dialect, from, to, translatable }: ForeignUse): ForeignUse {
    return { dialect, from, to, translatable };
}

/**
 * Where a script names the API of Postman, Insomnia or Bruno, and whether the bulb can write it
 * in `mandor.`. A script that does not parse has none to show: the editor marks what breaks it.
 */
export function foreignUsesOf(source: string): readonly ForeignUse[] {
    const program = programOf(source);

    return program === undefined ? [] : usesIn(program).map(shown);
}

function rewritten(source: string, edits: readonly ScriptEdit[]): string {
    const text = new MagicString(source);

    edits.forEach(({ from, text: replacement, to }) => {
        text.overwrite(from, to, replacement);
    });

    return text.toString();
}

/**
 * Writes in `mandor.` what the script names of another app, in the whole script or in the uses
 * that touch `range`. Only names the script does not declare are another app's, and only the
 * tables decide what they become: what has no match stays as it was, and stays marked. Nothing
 * else of the script moves, its comments and blanks included.
 */
export function translateScript(
    source: string,
    range: ScriptRange = { from: 0, to: source.length },
): ScriptTranslation {
    const program = programOf(source);

    if (program === undefined) {
        return { edits: [], parsed: false, text: source, untranslated: [] };
    }

    const touched = usesIn(program).filter((use) => use.from <= range.to && use.to >= range.from);
    const edits = touched.flatMap((use) => use.edits ?? []);

    return {
        edits,
        parsed: true,
        text: rewritten(source, edits),
        untranslated: touched.filter((use) => !use.translatable).map(shown),
    };
}

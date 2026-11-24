import type { AnyNode, CallExpression, Expression, Property, SpreadElement } from 'acorn';

/** The apps whose scripts Mandor reads: each one names its API under roots of its own. */
export type Dialect = 'postman' | 'insomnia' | 'bruno';

/** A stretch of a script, by offsets, the end not included. */
export type ScriptRange = { from: number; to: number };

/** A replacement of one stretch of the script, in the offsets of the script as it came. */
export type ScriptEdit = ScriptRange & { text: string };

/** Where a script names the API of another app, and whether the bulb can rewrite it. */
export type ForeignUse = ScriptRange & { dialect: Dialect; translatable: boolean };

/** A use of a name a table knows: where it sits, and what holds it. */
export type ForeignMatch = {
    /** The node of the name the table knows: the root, or a member of it. */
    named: AnyNode;
    /** Whether the chain goes on past that name, as `pm.test.skip` goes on past `pm.test`. */
    continued: boolean;
    /** The call the name is the callee of, when it is called. */
    call: CallExpression | undefined;
    /** Whether what the call gives is awaited or read on, as `await x` or `x.then`. */
    awaited: boolean;
    /** Whether an `await` may be written where the call sits: at the top, or in an async function. */
    awaitable: boolean;
};

/** How one name of another app is written in `mandor.`, or nothing when this use has no match. */
export type DialectRule = (match: ForeignMatch) => readonly ScriptEdit[] | undefined;

/** What one app names, from its roots: each key is the whole path, root included. */
export type DialectTable = {
    dialect: Dialect;
    roots: readonly string[];
    rules: ReadonlyMap<string, DialectRule>;
};

function edit(node: AnyNode, text: string): ScriptEdit {
    return { from: node.start, text, to: node.end };
}

/** A function or an object that `mandor` names otherwise. Nothing past it has a match. */
export function renamed(text: string): DialectRule {
    return ({ continued, named }) => (continued ? undefined : [edit(named, text)]);
}

/** A value that `mandor` names otherwise. What the script reads of it stays as it is. */
export function readAs(text: string): DialectRule {
    return ({ named }) => [edit(named, text)];
}

/** A getter called with nothing, which `mandor` reads as a value. */
export function calledAs(text: string): DialectRule {
    return ({ call }) => {
        if (call === undefined || call.arguments.length > 0) {
            return undefined;
        }

        return [edit(call, text)];
    };
}

function isField(
    property: Property | SpreadElement | undefined,
    name: string,
): property is Property {
    return (
        property?.type === 'Property' &&
        property.kind === 'init' &&
        !property.computed &&
        !property.method &&
        property.key.type === 'Identifier' &&
        property.key.name === name
    );
}

type KeyAndValue = { object: Expression; key: Expression; value: Expression };

/** The one argument `{ key, value }`, the name first: any other shape has no match. */
function keyAndValue(call: CallExpression): KeyAndValue | undefined {
    const [object, ...others] = call.arguments;

    if (object?.type !== 'ObjectExpression' || others.length > 0) {
        return undefined;
    }

    const [key, value, ...more] = object.properties;

    if (!isField(key, 'key') || !isField(value, 'value') || more.length > 0) {
        return undefined;
    }

    return { key: key.value, object, value: value.value };
}

/**
 * A header written as `add({ key, value })`, which `mandor` writes as `set(key, value)`. Only the
 * braces and the field names go: what the script wrote for the name and the value stays.
 */
export function headerAdded(text: string): DialectRule {
    return ({ call, named }) => {
        const pair = call === undefined ? undefined : keyAndValue(call);

        if (pair === undefined) {
            return undefined;
        }

        const { key, object, value } = pair;

        return [
            edit(named, text),
            { from: object.start, text: '', to: key.start },
            { from: key.end, text: ', ', to: value.start },
            { from: value.end, text: '', to: object.end },
        ];
    };
}

/**
 * A request sent with its options alone, which `mandor` answers with a promise: it is awaited,
 * unless the script already waits for it. A callback changes how the script flows, and a call
 * where no `await` may be written would need the function around it changed: neither has a match.
 */
export function sentAndAwaited(text: string): DialectRule {
    return ({ awaitable, awaited, call, named }) => {
        if (call?.arguments.length !== 1) {
            return undefined;
        }

        if (awaited) {
            return [edit(named, text)];
        }

        return awaitable ? [edit(named, `await ${text}`)] : undefined;
    };
}

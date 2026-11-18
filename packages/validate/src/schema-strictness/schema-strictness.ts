import {
    applyEdits,
    modify,
    parse,
    type FormattingOptions,
    type JSONPath,
    type ParseError,
} from 'jsonc-parser';

import { segmentOf } from '../schema-places/schema-places.js';
import { isRecord } from '../validate-value/schema-issue.js';

import { allSpotsOf, childSpotsOf, type SchemaSpot } from './schema-spots.js';

/** Whether every object the schema describes keeps a rule, none does, or only some. */
export type StrictnessState = 'all' | 'none' | 'some';

/**
 * How strict a schema is, read from its own text: whether its objects refuse a key they do not
 * declare, and whether every key they declare is one the value must have. The text is the only
 * place this lives, so what the schema says and what the switches show never part.
 */
export type SchemaStrictness = { closed: StrictnessState; required: StrictnessState };

/** The drafts before 2019-09, where an object closes with `additionalProperties`. */
const OLD_DRAFT = /json-schema\.org\/draft-0[3-7]/u;

function parsed(text: string): { value: unknown } | undefined {
    const errors: ParseError[] = [];
    const value: unknown = parse(text, errors, { allowTrailingComma: true });

    return errors.length > 0 ? undefined : { value };
}

function propertiesOf(schema: Record<string, unknown>): string[] {
    const properties = schema['properties'];

    return isRecord(properties) ? Object.keys(properties) : [];
}

/** An object that names its keys, itself or through what it applies in place. */
function describesObject(spot: SchemaSpot): boolean {
    return [spot, ...childSpotsOf(spot).filter((child) => child.inPlace)].some(
        (each) => propertiesOf(each.schema).length > 0,
    );
}

function pointerOf(path: JSONPath): string {
    return `#${path.map((segment) => `/${segmentOf(String(segment))}`).join('')}`;
}

/**
 * The objects a closing rule belongs on. Never a branch applied in place: a branch of `allOf`
 * that closes refuses the keys its siblings declare. Nor a definition such a branch refers to,
 * for the same reason; the object that applies them closes instead, and sees through them.
 */
function closableSpotsOf(spots: SchemaSpot[]): SchemaSpot[] {
    const inPlaceRefs = new Set(
        spots.filter((spot) => spot.inPlace).map((spot) => spot.schema['$ref']),
    );

    return spots.filter(
        (spot) => !spot.inPlace && describesObject(spot) && !inPlaceRefs.has(pointerOf(spot.path)),
    );
}

function isClosed(schema: Record<string, unknown>): boolean {
    return schema['unevaluatedProperties'] === false || schema['additionalProperties'] === false;
}

function allRequired(schema: Record<string, unknown>): boolean {
    const required = schema['required'];
    const list: unknown[] = Array.isArray(required) ? required : [];

    return propertiesOf(schema).every((key) => list.includes(key));
}

function stateOf(flags: boolean[]): StrictnessState {
    if (flags.length > 0 && flags.every(Boolean)) {
        return 'all';
    }

    return flags.some(Boolean) ? 'some' : 'none';
}

/** How strict the schema is, or nothing while its text cannot be read. */
export function schemaStrictnessOf(text: string): SchemaStrictness | undefined {
    const read = parsed(text);

    if (read === undefined) {
        return undefined;
    }

    const spots = allSpotsOf(read.value);

    return {
        closed: stateOf(closableSpotsOf(spots).map((spot) => isClosed(spot.schema))),
        required: stateOf(
            spots
                .filter((spot) => propertiesOf(spot.schema).length > 0)
                .map((spot) => allRequired(spot.schema)),
        ),
    };
}

/** The indentation the text already uses, so an edit reads as if written by the same hand. */
function formattingOf(text: string): FormattingOptions {
    const indent = /\n([ \t]+)\S/u.exec(text)?.[1] ?? '  ';

    return {
        insertSpaces: !indent.startsWith('\t'),
        tabSize: indent.startsWith('\t') ? 1 : indent.length,
        eol: text.includes('\r\n') ? '\r\n' : '\n',
    };
}

/** One change of a value inside the text, every comment and every other key kept. */
type Change = { path: JSONPath; value: unknown };

function changed(text: string, changes: Change[]): string {
    const formattingOptions = formattingOf(text);

    return changes.reduce(
        (current, change) =>
            applyEdits(current, modify(current, change.path, change.value, { formattingOptions })),
        text,
    );
}

function closingOf(spot: SchemaSpot, closed: boolean, keyword: string): Change[] {
    if (closed) {
        return isClosed(spot.schema) ? [] : [{ path: [...spot.path, keyword], value: false }];
    }

    return ['unevaluatedProperties', 'additionalProperties']
        .filter((each) => spot.schema[each] === false)
        .map((each) => ({ path: [...spot.path, each], value: undefined }));
}

/**
 * The schema with every object it describes closed to keys it does not declare, or open
 * again. A schema of a draft before 2019-09 closes with `additionalProperties`, the only word
 * it has; any other with `unevaluatedProperties`, which sees through `allOf` and conditions.
 */
export function withClosedObjects(text: string, closed: boolean): string {
    const read = parsed(text);

    if (read === undefined) {
        return text;
    }

    const root = isRecord(read.value) ? read.value : {};
    const keyword = OLD_DRAFT.test(String(root['$schema']))
        ? 'additionalProperties'
        : 'unevaluatedProperties';
    const changes = closableSpotsOf(allSpotsOf(read.value)).flatMap((spot) =>
        closingOf(spot, closed, keyword),
    );

    return changed(text, changes);
}

function requiringOf(spot: SchemaSpot, required: boolean): Change[] {
    const keys = propertiesOf(spot.schema);
    const written = spot.schema['required'];
    const list: unknown[] = Array.isArray(written) ? written : [];
    const next = required
        ? [...list, ...keys.filter((key) => !list.includes(key))]
        : list.filter((key) => typeof key !== 'string' || !keys.includes(key));
    const path = [...spot.path, 'required'];

    if (next.length === list.length && next.every((key, index) => key === list[index])) {
        return [];
    }

    return [{ path, value: next.length === 0 ? undefined : next }];
}

/** The schema with every key its objects declare made one the value must have, or none. */
export function withAllRequired(text: string, required: boolean): string {
    const read = parsed(text);

    if (read === undefined) {
        return text;
    }

    const changes = allSpotsOf(read.value)
        .filter((spot) => propertiesOf(spot.schema).length > 0)
        .flatMap((spot) => requiringOf(spot, required));

    return changed(text, changes);
}

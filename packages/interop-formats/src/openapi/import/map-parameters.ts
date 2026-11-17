import {
    INTEROP_PARAMETER_PLACES,
    type InteropParameter,
    type InteropParameterPlace,
} from '@mandor/interop-core';

import { asRecord, listAt, recordAt, textAt } from '../document/node-access.js';
import { exampleText } from './example-text.js';

/**
 * The parameters of an operation: those of its path item and its own, and when both name the
 * same one — same name, same place — the operation's wins. The order is the order they were
 * first written.
 */
export function parametersOf(
    item: Record<string, unknown>,
    operation: Record<string, unknown>,
): InteropParameter[] {
    const merged = new Map<string, InteropParameter>();

    for (const raw of [...listAt(item, 'parameters'), ...listAt(operation, 'parameters')]) {
        const parameter = parameterOf(asRecord(raw));

        if (parameter !== undefined) {
            merged.set(`${parameter.in}:${parameter.name}`, parameter);
        }
    }

    return [...merged.values()];
}

function parameterOf(node: Record<string, unknown>): InteropParameter | undefined {
    const name = textAt(node, 'name');
    const place = placeOf(node['in']);
    const schema = recordAt(node, 'schema');

    if (name === undefined || place === undefined) {
        return undefined;
    }

    return {
        name,
        in: place,
        // A path parameter is never optional, whatever the document says: the path breaks without it.
        required: place === 'path' || node['required'] === true,
        value: exampleText(valueOf(node, schema)),
        schema: Object.keys(schema).length > 0 ? JSON.stringify(schema) : undefined,
    };
}

/** The value a parameter starts with, the most specific the document gives first. */
function valueOf(node: Record<string, unknown>, schema: Record<string, unknown>): unknown {
    const named = Object.values(recordAt(node, 'examples')).map(
        (example) => asRecord(example)['value'],
    );

    return [node['example'], named[0], schema['default'], schema['example']].find(
        (value) => value !== undefined,
    );
}

function placeOf(value: unknown): InteropParameterPlace | undefined {
    return INTEROP_PARAMETER_PLACES.find((place) => place === value);
}

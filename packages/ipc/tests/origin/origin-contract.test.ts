import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import {
    originSwitchRequestSchema,
    restoredUiSessionSchema,
    sessionLoadRequestSchema,
    sessionLoadResultSchema,
    sessionSaveRequestSchema,
    emptyResultSchema,
    uiSessionSchema,
} from '../../src/index.js';
import { gridNodeSchema } from '../../src/session/grid-node.js';
import { openedOriginSchema } from '../../src/origin/opened-origin.js';
import { originListSchema } from '../../src/origin/origin-list.js';
import { sessionTabSchema } from '../../src/session/session-tab.js';

/**
 * What the renderer must never learn: where the work sits on this machine, and the version
 * control underneath it. A field that crosses the bridge can be painted by accident, so the
 * contract itself is checked here, as a test and not as a review.
 */
const HIDDEN_FIELDS = ['root', 'branch', 'head'];

const ORIGIN_AND_SESSION_SCHEMAS = {
    gridNode: gridNodeSchema,
    openedOrigin: openedOriginSchema,
    originList: originListSchema,
    originSwitch: originSwitchRequestSchema,
    restoredUiSession: restoredUiSessionSchema,
    sessionLoad: sessionLoadRequestSchema,
    sessionLoadResult: sessionLoadResultSchema,
    sessionSave: sessionSaveRequestSchema,
    sessionSaveResult: emptyResultSchema,
    sessionTab: sessionTabSchema,
    uiSession: uiSessionSchema,
};

/** Every field name a schema can produce, walking through wrappers, unions and recursion. */
function fieldNames(
    schema: z.core.$ZodType,
    seen: Set<z.core.$ZodType> = new Set<z.core.$ZodType>(),
): string[] {
    if (seen.has(schema)) {
        return [];
    }

    seen.add(schema);

    if (schema instanceof z.ZodObject) {
        const shape: Record<string, z.core.$ZodType> = schema.shape;

        return Object.entries(shape).flatMap(([key, field]) => [key, ...fieldNames(field, seen)]);
    }

    if (schema instanceof z.ZodUnion || schema instanceof z.ZodDiscriminatedUnion) {
        return schema.options.flatMap((option) => fieldNames(option, seen));
    }

    return fieldNames(unwrap(schema), seen);
}

function unwrap(schema: z.core.$ZodType): z.core.$ZodType {
    if (schema instanceof z.ZodArray) {
        return schema.element;
    }

    if (
        schema instanceof z.ZodNullable ||
        schema instanceof z.ZodOptional ||
        schema instanceof z.ZodDefault ||
        schema instanceof z.ZodLazy
    ) {
        return schema.unwrap();
    }

    return schema;
}

describe('the contract a renderer can see', () => {
    it('exposes no path, branch or head field in the origin and session channels', () => {
        for (const [name, schema] of Object.entries(ORIGIN_AND_SESSION_SCHEMAS)) {
            const leaked = fieldNames(schema).filter((field) => HIDDEN_FIELDS.includes(field));

            expect(leaked, name).toEqual([]);
        }
    });
});

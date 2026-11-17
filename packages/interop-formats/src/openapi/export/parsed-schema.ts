import { isRecord } from '@mandor/interop-core';

/** The schema as the object it is, when the text it came as is one the document can speak. */
export function parsedSchema(schema: string | undefined): Record<string, unknown> | undefined {
    if (schema === undefined || schema === '') {
        return undefined;
    }

    try {
        const parsed: unknown = JSON.parse(schema);

        return isRecord(parsed) ? parsed : undefined;
    } catch {
        return undefined;
    }
}

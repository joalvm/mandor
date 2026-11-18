import type { SchemaLint } from './editor-options.js';

/**
 * The lint option of an editor that carries a schema beside its text: the body is checked
 * against the schema while it is written. Absent or blank answers nothing — there is no shape
 * to check against. What the check answers is said in the language of the window by the
 * editor's own translation, which every mark of the margin passes through. The language of the
 * text decides whether the check applies at all: the diagnostics of the editor already run the
 * lint only where a schema can speak, and nowhere else.
 */
export function schemaLintOf(schema: string | undefined): SchemaLint | undefined {
    if (schema === undefined || schema.trim() === '') {
        return undefined;
    }

    return { schema: () => schema };
}

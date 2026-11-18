import { generateSync, type JsonSchema } from 'json-schema-faker';
import { parse, type ParseError } from 'jsonc-parser';

import { fixedForGeneration } from './fixup.js';
import { mulberry32 } from './random.js';

/** The knobs of one generation: a seed asks the same schema for the same body again. */
export type SchemaToValueOptions = { seed?: number };

/**
 * The body the schema asks for, written as JSON. The counterpart of `schemaFromValue`: where
 * that one reads a body and writes its shape, this one reads a shape and writes a body that
 * meets it. The randomness is real — the same schema draws a different body each time — and a
 * seed tames it, so a test can ask for the body it saw before.
 *
 * The intelligence of the generation is the coverage of the standard's keywords, and nothing
 * else: what the schema says with `format`, `pattern`, `enum` or `examples` is honored, and
 * nothing is guessed from the names of the properties. A keyword the engine never heard of
 * falls to the type it sits on, never to an error; a schema that cannot be read at all
 * generates an empty object to edit by hand.
 */
export function schemaToValue(schema: string, options?: SchemaToValueOptions): string {
    const errors: ParseError[] = [];
    const read: unknown = parse(schema, errors, { allowTrailingComma: true });

    if (errors.length > 0 || read === undefined || typeof read !== 'object' || read === null) {
        return '{}';
    }

    const seed = options?.seed ?? Math.floor(Math.random() * 2 ** 31);

    return JSON.stringify(generate(read, seed), null, 2);
}

function generate(schema: object, seed: number): unknown {
    try {
        return generateSync(fixedForGeneration(schema, mulberry32(seed)) as JsonSchema, {
            failOnInvalidTypes: false,
            optionalsProbability: 1,
            seed,
            useDefaultValue: true,
            useExamplesValue: true,
        });
    } catch {
        // A schema the engine cannot answer — a ref that resolves nowhere, a type it never
        // heard of — is not a reason to fail the click: an empty body to edit answers instead.
        return {};
    }
}

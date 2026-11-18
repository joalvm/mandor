import { z } from 'zod';

/** The JSON types a pair can promise to be. Technical names: the send reads them as data. */
export const KEY_VALUE_TYPES = ['boolean', 'integer', 'number', 'string'] as const;

type KeyValueLineType = (typeof KEY_VALUE_TYPES)[number];

/**
 * What a pair promises about itself, past its name and its value. Everything is optional: a
 * pair that says nothing about its type is sent the same, only less documented.
 */
export type KeyValueMeta = {
    default?: string | undefined;
    deprecated?: boolean | undefined;
    /** Enum values, written separated by commas, exactly as the user keeps them. */
    enumValues?: string | undefined;
    max?: string | undefined;
    min?: string | undefined;
    required?: boolean | undefined;
    type?: KeyValueLineType | undefined;
};

export const keyValueMetaSchema = z.object({
    default: z.string().optional(),
    deprecated: z.boolean().optional(),
    enumValues: z.string().optional(),
    max: z.string().optional(),
    min: z.string().optional(),
    required: z.boolean().optional(),
    type: z.enum(KEY_VALUE_TYPES).optional(),
}) satisfies z.ZodType<KeyValueMeta>;

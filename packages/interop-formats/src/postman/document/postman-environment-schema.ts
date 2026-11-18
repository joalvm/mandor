import { z } from 'zod';

/** An environment or a globals file: the same shape, told apart by the scope it declares. */
export const postmanEnvironmentSchema = z
    .object({
        id: z.string().optional(),
        name: z.string(),
        values: z.array(
            z
                .object({
                    key: z.string(),
                    value: z.unknown().optional(),
                    enabled: z.boolean().optional(),
                    type: z.string().optional(),
                })
                .loose(),
        ),
        _postman_variable_scope: z.enum(['environment', 'globals']),
    })
    .loose();

export type PostmanEnvironment = z.infer<typeof postmanEnvironmentSchema>;

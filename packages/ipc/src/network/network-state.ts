import { networkSettingsSchema } from '@mandor/schema';
import { z } from 'zod';

import { resultSchema } from '../result/result-schema.js';

/**
 * The network settings of this machine, and which of their secrets the keychain keeps. Whether
 * a password exists travels; the password does not — the form shows a kept field as kept and
 * never needs the value to do it.
 */
const networkStateSchema = z
    .object({
        settings: networkSettingsSchema,
        kept: z
            .object({
                proxyPassword: z.boolean(),
                /** The ids of the client certificates whose passphrase is kept. */
                passphrases: z.array(z.string()),
            })
            .strict(),
    })
    .strict();

export const networkReadResultSchema = resultSchema(networkStateSchema);

/** The settings as the window writes them, whole: what it leaves out is what it took away. */
export const networkWriteRequestSchema = networkSettingsSchema;

export type NetworkState = z.infer<typeof networkStateSchema>;

import { z } from 'zod';

import { resultSchema } from '../result/result-schema.js';

/** Whose secret: the password of the written proxy, or the passphrase of one client certificate. */
const networkSecretTargetSchema = z.discriminatedUnion('kind', [
    z.object({ kind: z.literal('proxy') }).strict(),
    z.object({ kind: z.literal('certificate'), id: z.string().regex(/^[\w-]{1,64}$/u) }).strict(),
]);

/** A value goes to the keychain; an empty one takes the kept one out. */
export const networkSecretRequestSchema = z
    .object({ target: networkSecretTargetSchema, value: z.string().max(4096) })
    .strict();

/** What a file is picked for: the dialog offers the extensions that kind of file has. */
const NETWORK_FILE_PURPOSES = ['ca', 'cert', 'key', 'pfx'] as const;

export const networkChooseFileRequestSchema = z
    .object({ purpose: z.enum(NETWORK_FILE_PURPOSES) })
    .strict();
/** The path the user picked, or null when they closed the dialog. */
export const networkChooseFileResultSchema = resultSchema(z.string().nullable());

export type NetworkSecretRequest = z.infer<typeof networkSecretRequestSchema>;
export type NetworkFilePurpose = (typeof NETWORK_FILE_PURPOSES)[number];

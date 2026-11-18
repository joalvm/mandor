import { z } from 'zod';

const SHA256_HEX = /^[a-f0-9]{64}$/;

/**
 * What a response body is once it leaves the transport: text or base64 while it stays in
 * memory, or a reference to the file the app wrote when it was big. Never raw bytes, because the
 * bridge redacts every answer by walking it and a byte array comes out as an object of numbers.
 * `ref` is the sha-256 of the bytes in hex and nothing else: it names a file, it is never a path.
 */
export const responseBodySchema = z.discriminatedUnion('kind', [
    z.discriminatedUnion('encoding', [
        z.object({
            kind: z.literal('inline'),
            encoding: z.literal('utf8'),
            text: z.string(),
        }),
        z.object({
            kind: z.literal('inline'),
            encoding: z.literal('base64'),
            data: z.string(),
        }),
    ]),
    z.object({
        kind: z.literal('stored'),
        ref: z.string().regex(SHA256_HEX),
        bytes: z.number().int().nonnegative(),
        contentType: z.string(),
    }),
]);

export type ResponseBody = z.infer<typeof responseBodySchema>;

import { z } from 'zod';

/** A path that stays inside the repo: relative, forward slashes, no `.` or `..` segment. */
function staysInRepo(path: string): boolean {
    return (
        path.length > 0 &&
        !path.includes('\\') &&
        !path.includes(':') &&
        path.split('/').every((segment) => segment !== '' && segment !== '.' && segment !== '..')
    );
}

/**
 * One clash waiting for a person. It keeps the two texts the file was merged from and nothing
 * else: «mine» is the file on disk, so a copy of it would only be able to go stale. The record
 * lives in `.mandor/conflicts/` and never reaches git. `source` says which step found the clash:
 * an old write from the window, or a merge of the origin.
 */
export const conflictRecordSchema = z
    .object({
        path: z.string().refine(staysInRepo, {
            message: 'A conflict path is relative to the repo and stays inside it',
        }),
        source: z.enum(['write', 'merge']),
        base: z.string().nullable(),
        theirs: z.string().nullable(),
        at: z.iso.datetime(),
    })
    .strict();

export type ConflictRecord = z.infer<typeof conflictRecordSchema>;

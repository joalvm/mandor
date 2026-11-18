import { z } from 'zod';

/**
 * The path of a file a body names, relative to the root of the repo. A request travels inside a
 * repo other people open: a path that could name anything on the disk would turn «open and send»
 * into sending a stranger's file to your server. Absolute, a drive letter and a segment that
 * climbs out are all refused here; the sender checks again, because the renderer is what a
 * stranger reaches.
 */
export const bodyFilePathSchema = z
    .string()
    .min(1)
    .refine((path) => !path.startsWith('/') && !/^[A-Za-z]:/.test(path), {
        message: 'The path of a body file is relative to the root of the repo.',
    })
    .refine((path) => !path.includes('\\'), {
        message: 'The path of a body file separates its segments with «/».',
    })
    .refine((path) => path.split('/').every((segment) => segment !== '..'), {
        message: 'The path of a body file stays inside the repo.',
    });

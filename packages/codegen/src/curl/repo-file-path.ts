import { bodyFilePathSchema } from '@mandor/schema';

/**
 * Whether a body file can be named by a request: a path inside the repo. `-` is standard input,
 * which a path rule does not know, and which a saved request cannot read.
 */
export function isRepoFilePath(path: string): boolean {
    return path !== '-' && bodyFilePathSchema.safeParse(path).success;
}

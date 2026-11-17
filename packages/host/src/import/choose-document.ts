import type { InteropInput } from '@mandor/interop-core';

/**
 * The one way something to import reaches main: the paths the user picked in the open dialog of
 * the operating system, a file, several, or a folder as the format asks. Null is the user
 * changing their mind, which is not a failure.
 */
export type ChooseDocument = (input: InteropInput) => Promise<readonly string[] | null>;

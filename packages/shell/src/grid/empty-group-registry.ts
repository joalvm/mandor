import { createDeclarations } from '../declare/declarations.js';

/** The one id the page goes by: the answer is of the window, and a group has no kind to ask. */
export const EMPTY_GROUP_ID = 'window';

/** The registry `EmptyGroup` writes into: what a group with no tab in it shows instead. */
export const emptyGroupDeclarations = createDeclarations<{ id: string }, 'content'>();

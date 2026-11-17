import { createDeclarations } from '../declare/declarations.js';

/**
 * The registry `TabStripAction` writes into: what every strip of the window offers beside its
 * tabs to add one more of them, in the order each one arrived.
 */
export const tabStripActionDeclarations = createDeclarations<{ id: string }, 'content'>();

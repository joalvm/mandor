import type { ItemOrigin } from '../collection/item-origin.js';
import type { Variable } from './variable.js';

/** A named set of variables a workspace interpolates `{{var}}` against. */
export type Environment = {
    id: string;
    name: string;
    variables: Variable[];
    /** Set when an import wrote it; absent means a person did, and an import never overwrites that. */
    origin?: ItemOrigin | undefined;
};

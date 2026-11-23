import { useMemo } from 'react';

import { declaredInScripts, type ScriptsOf } from '../lib/script-entries.js';

/**
 * The names the scripts of a place declare, as the same list while the names stay the same.
 * Typing a script changes its text at every key, and what the editors know is rebuilt only when a
 * name comes or goes.
 */
export function useDeclaredInScripts(
    levels: readonly (ScriptsOf<string> | undefined)[],
): readonly string[] {
    const key = declaredInScripts(levels).join('\n');

    return useMemo(() => key.split('\n').filter(Boolean), [key]);
}

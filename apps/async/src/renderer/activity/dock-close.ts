import { createContext } from 'react';

/**
 * How the dock closes, for the band each detail draws over itself. A detail drawn outside a
 * dock has nothing to close, and its band offers no way out.
 */
export const DockCloseContext = createContext<(() => void) | null>(null);

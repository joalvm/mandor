import { createContext } from 'react';

/**
 * The id of the section whose parts are being declared, given by `SidebarSection`, and of the
 * section being drawn, given by `SidebarSections` around its header and its body.
 */
export const SidebarSectionIdContext = createContext<string | null>(null);

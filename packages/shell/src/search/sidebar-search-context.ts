import { createContext, type RefObject } from 'react';

/** The box the field of the searcher stands in, given by the sidebar to the field it draws. */
export const SidebarSearchFieldContext = createContext<RefObject<HTMLSpanElement | null> | null>(
    null,
);

/** The id of the searcher whose parts are being declared, given by `SidebarSearch`. */
export const SidebarSearchIdContext = createContext<string | null>(null);

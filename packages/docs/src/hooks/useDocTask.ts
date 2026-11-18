import { createContext, useContext } from 'react';

/** Ticks or unticks the task of the doc at this place, counted in the order the page draws them. */
export type DocTaskToggle = (index: number) => void;

export const DocTaskContext = createContext<DocTaskToggle | null>(null);

/**
 * What the surface around the doc does when a box of the page is pressed, or `null` where it
 * offered nothing and the box only shows what the text says. It travels by context for the same
 * reason the opening of a link does: the components of the markdown are one table built once.
 */
export function useDocTask(): DocTaskToggle | null {
    return useContext(DocTaskContext);
}

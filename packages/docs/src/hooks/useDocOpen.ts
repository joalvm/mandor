import { createContext, useContext } from 'react';

/**
 * What a doc does with a link that names a resource of the workbench. `aside` asks for the group
 * next to the one being read, which is where a doc sends what it describes by default.
 */
export type DocOpen = (uri: string, aside: boolean) => void;

export const DocOpenContext = createContext<DocOpen | null>(null);

/**
 * How the surface around the doc opens a resource, or `null` where nothing offered to. It travels
 * by context because the components of the markdown are one table built once, and a component
 * closed over a prop would be a new one on every render, remounting the whole doc as it was read.
 */
export function useDocOpen(): DocOpen | null {
    return useContext(DocOpenContext);
}

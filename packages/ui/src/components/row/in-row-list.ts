import { createContext, useContext } from 'react';

const InRowList = createContext(false);

export const InRowListProvider = InRowList.Provider;

/** Whether a list around the row walks its rows: then the row is no stop of the tabulator itself. */
export function useInRowList(): boolean {
    return useContext(InRowList);
}

import { createContext, useContext } from 'react';

/**
 * The id under which a row keeps its name, so the row is announced by the label it already
 * draws. The name is written once, where it is read: inside the row, in its `RowLabel`.
 *
 * A row is a box of pieces —a glyph, the name, the menu that acts on it— and a reader that
 * builds the name out of the whole box announces the state light and the options button along
 * with it. Pointing at the label instead leaves the row saying what it is called and nothing
 * else, without any caller repeating the name in two places.
 */
const RowName = createContext<string | undefined>(undefined);

export const RowNameProvider = RowName.Provider;

/** The id this row's label has to carry, or nothing when the label stands outside a row. */
export function useRowNameId(): string | undefined {
    return useContext(RowName);
}

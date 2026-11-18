import { createContext, useContext } from 'react';

/** What a menu tells the lines it holds, and how a line hands it the command it was chosen for. */
type MenuContextValue = {
    /** Whether the lines may carry the mark of the chosen one. */
    checkable: boolean;
    /** Keeps the command of the line chosen, to run as the menu closes. */
    choose: (command: () => void) => void;
};

export const MenuContext = createContext<MenuContextValue>({
    checkable: false,
    choose: (command) => {
        command();
    },
});

/** Reads what the menu around this line promised. */
export function useMenuContext(): MenuContextValue {
    return useContext(MenuContext);
}

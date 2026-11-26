import { createStore } from 'zustand/vanilla';

/** How the tabs of the window behave, as the person set them in the settings of the app. */
export type TabPreferences = {
    /** A click that would only take a look opens a tab that stays instead. */
    alwaysNew: boolean;
    /** Closing a tab with unsaved work asks first; without asking, the work is let go. */
    askUnsaved: boolean;
    /** How far back reopening reaches: closing one more forgets the oldest. */
    closedKept: number;
};

// store-scope: window — how the tabs behave is the person's, and a switch of origin keeps it.
export const tabPreferences = createStore<TabPreferences>(() => ({
    alwaysNew: false,
    askUnsaved: true,
    closedKept: 20,
}));

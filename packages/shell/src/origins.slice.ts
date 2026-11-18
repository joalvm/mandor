import type { Origin, OriginSyncState } from '@mandor/schema';

export type OriginsSlice = {
    activeOriginId: string | null;
    origins: Origin[];
    /** True while a switch runs: the window says it is working and accepts nothing new. */
    switchingOrigin: boolean;
    /** Where the open origin stands against its remote; `null` until main says, and between origins. */
    syncState: OriginSyncState | null;
};

export function initialOriginsSlice(): OriginsSlice {
    return { activeOriginId: null, origins: [], switchingOrigin: false, syncState: null };
}

/** What the window does to the data of the origins it knows and of the one that is open. */
export type OriginsActions = {
    setOrigins: (origins: Origin[]) => void;
    setSwitchingOrigin: (switching: boolean) => void;
    setSyncState: (syncState: OriginSyncState | null) => void;
};

export function originsActionsFor(set: (partial: Partial<OriginsSlice>) => void): OriginsActions {
    return {
        setOrigins: (origins) => {
            set({ origins: [...origins] });
        },
        setSwitchingOrigin: (switchingOrigin) => {
            set({ switchingOrigin });
        },
        setSyncState: (syncState) => {
            set({ syncState });
        },
    };
}

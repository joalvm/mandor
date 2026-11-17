import { createContext } from 'react';

/** What the timeline can do about a fault, given by the connection the timeline belongs to. */
export type FaultActions = {
    /** Opens the socket again past its scripts: the way out of one that kept it shut. */
    connectWithoutScripts: () => void;
};

/** None outside a connection: the detail of a fault then only tells what happened. */
export const FaultActionsContext = createContext<FaultActions | null>(null);

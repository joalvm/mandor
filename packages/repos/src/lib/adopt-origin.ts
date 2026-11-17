import type { OpenedOrigin } from '@mandor/ipc';

/**
 * What a window does with an origin main has just opened: its workspaces, its session, and
 * whatever the app shows when there is nothing else to show.
 *
 * It is a parameter and not a call because what an origin holds is of the app, and this
 * package would have to know a workspace to do it itself.
 */
export type AdoptOrigin = (originId: string, opened: OpenedOrigin) => Promise<void>;

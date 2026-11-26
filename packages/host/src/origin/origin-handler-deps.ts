import type { UnreadableDeps } from '../notice/unreadable-files.js';

/** Where the app keeps what belongs to no origin, and the folder its origins are copied into. */
export type OriginHandlerDeps = UnreadableDeps & {
    repoFolder: string;
    userDataDir: string;
};

import type { WorkspaceKind } from '@mandor/schema';

import type { UnreadableDeps } from '../notice/unreadable-files.js';

/** Where the app keeps what belongs to no origin, and which kind of workspace this app hosts. */
export type OriginHandlerDeps = UnreadableDeps & {
    kind: WorkspaceKind;
    userDataDir: string;
};

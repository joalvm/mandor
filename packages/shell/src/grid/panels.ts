import type { UiSession } from '@mandor/ipc';

/**
 * The sizes the user set with a drag. They live in the session because a window that forgets
 * how it was arranged asks to be arranged again on every start.
 */
export type Panels = UiSession['panels'];

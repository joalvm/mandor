import type { SessionTab } from '@mandor/ipc';

/**
 * One view of a resource inside a group. It is the same shape the session stores, because
 * there is nothing about a tab worth keeping that stops mattering when the window closes.
 * The title is not in it: the tab kind reads that off the resource.
 */
export type Tab = SessionTab;

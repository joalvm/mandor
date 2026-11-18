/**
 * One path the watcher named during a window. `renamed` is the event the platform gave, and it
 * says a name appeared or vanished, never which of the two: only the batch can tell them apart.
 */
export type WatchedPath = { path: string; renamed: boolean };

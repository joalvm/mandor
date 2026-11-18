/** Which level of the auth chain a call touches: the workspace itself, or one folder. */
export type AuthPlace = { kind: 'workspace' } | { kind: 'folder'; path: string };

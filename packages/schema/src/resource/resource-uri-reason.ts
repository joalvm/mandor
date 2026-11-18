/**
 * Which part of a URI broke. The UI picks its message from this and never from the error text,
 * and a caller that only wants to know whether a link is openable ignores it.
 */
export type ResourceUriReason = 'scheme' | 'repo' | 'workspace' | 'kind' | 'path';

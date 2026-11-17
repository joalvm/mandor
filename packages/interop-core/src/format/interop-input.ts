/**
 * What a format asks of the person who imports: the one file it reads, several files that belong
 * together, or a folder whose shape is part of the document.
 */
export const INTEROP_INPUTS = ['file', 'files', 'folder'] as const;

export type InteropInput = (typeof INTEROP_INPUTS)[number];

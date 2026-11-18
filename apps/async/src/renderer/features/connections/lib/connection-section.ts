/**
 * Which half of the panel of a connection is being read. Composing is what the panel is for, so
 * that is where it opens; the description is looked at when somebody wants it. The section itself
 * is remembered by the window, beside the resource, and not by this feature.
 */
export const DEFAULT_CONNECTION_SECTION = 'payload';

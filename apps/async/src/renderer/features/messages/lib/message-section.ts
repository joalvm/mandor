/**
 * Which half of the strip of a message is being read. The payload is what the item is for, so
 * that is where it opens; the description is looked at when somebody wants it. The section is
 * remembered by the window, beside the resource, and not by this feature.
 */
export const DEFAULT_MESSAGE_SECTION = 'payload';

/**
 * What an editor of markdown sends up its page when its reader asks for the preview beside it
 * (`Ctrl+K V`, the chord of VS Code). The editor does not know who draws a preview, or whether
 * anybody does: whoever holds it listens on an element around it.
 */
export const MARKDOWN_PREVIEW_EVENT = 'mandor:markdown-preview';

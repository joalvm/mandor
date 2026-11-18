/** A `{{name}}` template, the way an environment variable is written into a text. */
const TEMPLATE = /\{\{[^}]*\}\}/g;

/**
 * The text with each template standing in for a number of its own width. A template is a value
 * the parser cannot read until it is resolved; masked, the text reads like the one that will be
 * sent, bare or quoted, and every offset of a mark still lands on the text that was written.
 */
export function maskedTemplates(text: string): string {
    return text.replace(TEMPLATE, (template) => '1'.repeat(template.length));
}

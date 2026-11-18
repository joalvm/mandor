import { MARKDOWN_DEFAULT_SCHEMA, type MarkdownSchema } from '@mandor/ui';

/**
 * What a doc is allowed to leave in the tree. It is the schema of the forges with its two lists
 * of URL schemes rewritten, and it is not a setting: there is no way to hand another one in.
 *
 * `mandor:` joins the links because a doc points at the resource it describes. `mailto:`, `irc:`
 * and `xmpp:` come out, because none of them names something this app opens.
 *
 * The images are left with no scheme at all, so only a path written against the doc survives. An
 * image is fetched with nobody clicking it, which turns a remote one into a report to a stranger
 * that the reader never agreed to send.
 */
export const DOC_SANITIZE_SCHEMA: MarkdownSchema = {
    ...MARKDOWN_DEFAULT_SCHEMA,
    protocols: {
        ...MARKDOWN_DEFAULT_SCHEMA.protocols,
        href: ['mandor', 'http', 'https'],
        src: [],
    },
};

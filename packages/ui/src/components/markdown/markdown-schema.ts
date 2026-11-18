import { defaultSchema, type Options as MarkdownSchema } from 'rehype-sanitize';

export type { MarkdownSchema };

/** What a tree is allowed to keep when nothing says otherwise: the schema of the forges. */
export const MARKDOWN_DEFAULT_SCHEMA: MarkdownSchema = defaultSchema;

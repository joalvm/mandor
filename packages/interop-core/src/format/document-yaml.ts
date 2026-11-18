import { stringify } from 'yaml';

/**
 * The document as the text that travels: YAML, the shape the AsyncAPI documents people read and
 * review come in. No wrapping — a wrapped value turns one edited field into a multi-line diff —
 * and two spaces of indent, the same the workspace files are written with.
 */
export function documentYamlOf(document: unknown): string {
    return stringify(document, { lineWidth: 0, indent: 2 });
}

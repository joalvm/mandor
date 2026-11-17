/** What the sweep of a template finds: literal stretches and `{{name}}` placeholders. */
export type TemplateSegment =
    | { kind: 'literal'; text: string }
    /** `index` is the offset of the opening `{{`: where the interface underlines it. */
    | { kind: 'variable'; name: string; index: number };

// The placeholder syntax, same as Postman: `{{name}}`, escaped as `\{{name}}` for a literal
// brace. The name holds no whitespace and no braces, so `{{ a }}` never matches and an
// unclosed `{{` stays plain text. `$name` matches on purpose: `$` is banned in declarations
// (variableNameSchema) but is how a text references a dynamic variable.
const PLACEHOLDER = /\\?\{\{(?:[^\s{}]+)\}\}/g;

/**
 * Splits a template into literal stretches and placeholders. An escaped `\{{name}}` comes
 * out as the literal `{{name}}` without the backslash, so the resolver never looks it up.
 */
export function scanTemplate(template: string): TemplateSegment[] {
    const segments: TemplateSegment[] = [];
    let cursor = 0;

    for (const match of template.matchAll(PLACEHOLDER)) {
        const raw = match[0];

        pushLiteral(segments, template.slice(cursor, match.index));
        segments.push(segmentOf(raw, match.index));
        cursor = match.index + raw.length;
    }

    pushLiteral(segments, template.slice(cursor));

    return segments;
}

function segmentOf(raw: string, index: number): TemplateSegment {
    if (raw.startsWith('\\')) {
        return { kind: 'literal', text: raw.slice(1) };
    }

    return { kind: 'variable', name: raw.slice(2, -2), index };
}

function pushLiteral(segments: TemplateSegment[], text: string): void {
    if (text === '') {
        return;
    }

    segments.push({ kind: 'literal', text });
}

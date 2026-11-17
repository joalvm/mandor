import { degradation, type Degradation, isRecord } from '@mandor/interop-core';

/** `{{ _.name }}` and `{{ name }}`: the two ways Insomnia points at a variable of an environment. */
const REFERENCE = /\{\{\s*(?:_\.)?([A-Za-z_][\w-]*)\s*\}\}/g;

/** Anything of Insomnia's template language that is left once the references are rewritten. */
const TEMPLATE = /\{%[\s\S]*?%\}|\{\{[^{}]*\}\}/g;

const PLAIN_REFERENCE = /^\{\{[^\s{}]+\}\}$/;

/**
 * Rewrites every reference to a variable inside strings, arrays and plain objects, the way
 * Mandor writes it: `{{name}}`. Insomnia renders its templates with Nunjucks, which Mandor does
 * not: a tag or an expression stays as text, and is said once, in order of appearance.
 */
export function withTemplates<T>(value: T): { value: T; notes: Degradation[] } {
    const notes: Degradation[] = [];

    return { value: rewritten(value, notes) as T, notes };
}

function rewritten(value: unknown, notes: Degradation[]): unknown {
    if (typeof value === 'string') {
        return converted(value, notes);
    }

    if (Array.isArray(value)) {
        return value.map((each) => rewritten(each, notes));
    }

    if (isRecord(value)) {
        return Object.fromEntries(
            Object.entries(value).map(([key, each]) => [key, rewritten(each, notes)]),
        );
    }

    return value;
}

function converted(text: string, notes: Degradation[]): string {
    const plain = text.replace(REFERENCE, '{{$1}}');

    for (const [template] of plain.matchAll(TEMPLATE)) {
        const sentence = degradation('templateUnsupported', { template });

        if (
            !PLAIN_REFERENCE.test(template) &&
            !notes.some(({ values }) => values['template'] === template)
        ) {
            notes.push(sentence);
        }
    }

    return plain;
}

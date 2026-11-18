import { DYNAMIC_NAMES } from '../dynamic/dynamic-names.js';
import { lookupVariable } from '../resolution/lookup-variable.js';
import { scanTemplate, type TemplateSegment } from '../resolution/scan-template.js';
import type { VariableScope } from '../resolution/variable-scope.js';
import { openVariable } from './open-variable.js';

/** How a stretch of a template earns its color while the field holds it. */
export type TemplateTone =
    /** Text around tokens, and everything a token never was: braces escaped, spaces inside. */
    | 'plain'
    /** Declared with a value, or a dynamic reference the engine computes. */
    | 'known'
    /** Declared, but its value is blank: the name exists, nothing resolves from it. */
    | 'empty'
    /** Nobody declared it: what the field holds will go out unresolved. */
    | 'missing'
    /** A `{{` still open: the name is being written and nothing is promised yet. */
    | 'open';

/** One stretch of the template the interface paints, in the order the text holds it. */
export type TemplateStretch = {
    text: string;
    tone: TemplateTone;
    /** The name the stretch carries; absent when the tone is plain. */
    name?: string;
};

/**
 * Reads a template the way the field shows it: every closed `{{name}}` with the tone its
 * declaration earns, and a tail still open after the last unwritten `{{`. It scans the same
 * grammar the resolver accepts, so what the field paints is exactly what would resolve.
 */
export function templateStretches(template: string, scope: VariableScope): TemplateStretch[] {
    const query = openVariable(template);

    if (query !== null) {
        const start = template.lastIndexOf('{{');

        return [
            ...templateStretches(template.slice(0, start), scope),
            { text: template.slice(start), tone: 'open', name: query },
        ];
    }

    return scanTemplate(template).map((segment) => stretchOf(segment, scope));
}

function stretchOf(segment: TemplateSegment, scope: VariableScope): TemplateStretch {
    if (segment.kind === 'literal') {
        return { text: segment.text, tone: 'plain' };
    }

    return {
        text: `{{${segment.name}}}`,
        tone: toneOf(segment.name, scope),
        name: segment.name,
    };
}

function toneOf(name: string, scope: VariableScope): TemplateTone {
    const found = lookupVariable(scope, name);

    if (found !== undefined) {
        return found.value === '' ? 'empty' : 'known';
    }

    if (DYNAMIC_NAMES.some((dynamic) => dynamic === name)) {
        return 'known';
    }

    return 'missing';
}

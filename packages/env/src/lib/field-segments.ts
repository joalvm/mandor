import type { InputSegment } from '@mandor/ui';
import { templateStretches, type TemplateTone, type VariableScope } from '@mandor/vars';

/** How a tone of the template is painted in a field: plain text earns no tone at all. */
const TONES: Record<TemplateTone, InputSegment['tone']> = {
    plain: undefined,
    known: 'resolved',
    empty: 'empty',
    missing: 'missing',
    open: 'open',
};

/**
 * The segments of the template as the scope paints them: a name some level declares with a
 * value comes out resolved, one declared blank comes out empty, and a name nobody declared
 * anywhere comes out missing. The scope is the one main sends with, so the tone is the truth.
 */
export function fieldSegments(template: string, scope: VariableScope): InputSegment[] {
    return templateStretches(template, scope).map((stretch) => ({
        text: stretch.text,
        tone: TONES[stretch.tone],
        ...(stretch.name === undefined ? {} : { name: stretch.name }),
    }));
}

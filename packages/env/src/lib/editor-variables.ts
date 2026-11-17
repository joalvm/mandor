import type { EditorVariableHover, EditorVariables } from '@mandor/ui';
import type { VariableScope } from '@mandor/vars';

import { fieldSegments } from './field-segments.js';

/**
 * The variables of a document as the editor reads them: every token the scope earns a tone,
 * with the name it carries so the popover can speak of it. The resolver rides the editor
 * options, so a change of scope reconfigures the editor once.
 */
export function editorVariables(
    scope: VariableScope,
    onHover: (hover: EditorVariableHover | null) => void,
): EditorVariables {
    return {
        onHover,
        variablesOf: (text: string) => {
            let at = 0;

            return fieldSegments(text, scope).flatMap((segment) => {
                const from = at;

                at += segment.text.length;

                return segment.tone === undefined || segment.name === undefined
                    ? []
                    : [{ from, to: at, tone: segment.tone, name: segment.name }];
            });
        },
    };
}

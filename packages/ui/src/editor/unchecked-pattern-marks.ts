import { uncheckedPatternRanges } from '@mandor/validate';

import type { DiagnosticsOf } from './editor-diagnostic.js';
import type { EditorOptions } from './editor-options.js';

/**
 * The options of a schema editor with a warning over each pattern no check reads, said in the
 * words of the mounter and added to the marks it already checks. Without words the pane edits
 * no schema, and its options stay as they came.
 */
export function withUncheckedPatternMarks(
    options: EditorOptions,
    said: string | undefined,
): EditorOptions {
    if (said === undefined) {
        return options;
    }

    const own = options.check;
    const marks: DiagnosticsOf = (text) =>
        uncheckedPatternRanges(text).map(({ from, to }) => ({
            from,
            to,
            message: said,
            severity: 'warning',
        }));

    return {
        ...options,
        check: own === undefined ? marks : (text) => [...own(text), ...marks(text)],
    };
}

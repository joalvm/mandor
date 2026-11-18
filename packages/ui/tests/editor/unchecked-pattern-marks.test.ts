import { describe, expect, it } from 'vitest';

import type { EditorDiagnostic } from '../../src/editor/editor-diagnostic.js';
import { withUncheckedPatternMarks } from '../../src/editor/unchecked-pattern-marks.js';

const SAID = 'No se comprueba';
const SCHEMA = '{"pattern": "^(a|aa){1,40}$"}';

describe('the marks a schema editor puts on the patterns no check reads', () => {
    it('warns over each one in the words of the mounter', () => {
        const check = withUncheckedPatternMarks({}, SAID).check;

        expect(check?.(SCHEMA)).toEqual([{ from: 12, to: 28, message: SAID, severity: 'warning' }]);
    });

    it('adds them to the marks the mounter already checks', () => {
        const own: EditorDiagnostic = { from: 0, to: 1, message: 'own', severity: 'error' };
        const options = withUncheckedPatternMarks({ check: () => [own], wordWrap: 'on' }, SAID);

        expect(options.wordWrap).toBe('on');
        expect(options.check?.(SCHEMA)).toEqual([
            own,
            { from: 12, to: 28, message: SAID, severity: 'warning' },
        ]);
    });

    /** A pane that edits a payload has no words for it, and its options stay as they came. */
    it('leaves the options alone without words to say it', () => {
        const options = { wordWrap: 'on' as const };

        expect(withUncheckedPatternMarks(options, undefined)).toBe(options);
    });
});

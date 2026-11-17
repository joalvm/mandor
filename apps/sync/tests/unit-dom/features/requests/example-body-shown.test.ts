import { formattedJsonc } from '@mandor/ui';
import { describe, expect, it } from 'vitest';

import { bodyShownOf } from '../../../../src/renderer/features/requests/lib/example-body-shown.js';

describe('the body of an example as it is drawn (example-body-shown)', () => {
    it('lays out a JSON body kept on one line, as the editor lays it out', () => {
        const shown = bodyShownOf('{"id":1,"data":{"ok":true}}', 'jsonc');

        expect(shown).toBe(formattedJsonc('{"id":1,"data":{"ok":true}}'));
        expect(shown.split('\n')).toHaveLength(6);
    });

    it('leaves a body that already has lines of its own', () => {
        expect(bodyShownOf('{\n"id":1}', 'jsonc')).toBe('{\n"id":1}');
    });

    it('leaves a JSON body that does not parse, and any other language', () => {
        expect(bodyShownOf('{"id":', 'jsonc')).toBe('{"id":');
        expect(bodyShownOf('<a><b/></a>', 'xml')).toBe('<a><b/></a>');
        expect(bodyShownOf('{"id":1}', 'plaintext')).toBe('{"id":1}');
    });
});

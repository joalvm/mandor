import { describe, expect, it } from 'vitest';

import { sniffMandor } from '../../../src/mandor/document/sniff-mandor.js';
import { fixtureText } from '../support/sample-workspace.js';

describe('sniffMandor', () => {
    it.each(['sync-workspace.mandor.yaml', 'async-workspace.mandor.yaml'])(
        'recognizes %s by the root alone',
        (name) => {
            expect(sniffMandor(fixtureText(name))).toBe(true);
        },
    );

    it('recognizes the same bundle written as JSON', () => {
        expect(sniffMandor('{"mandor":"workspace","formatVersion":1}')).toBe(true);
    });

    it.each([
        ['another kind of Mandor file', 'mandor: collection\n'],
        ['an OpenAPI document', 'openapi: 3.1.0\n'],
        ['a list at the root', '- mandor\n- workspace\n'],
        ['text that is neither YAML nor JSON', ': : :\n\t- ]'],
        ['an empty text', ''],
    ])('does not take %s for a workspace', (_what, text) => {
        expect(sniffMandor(text)).toBe(false);
    });
});

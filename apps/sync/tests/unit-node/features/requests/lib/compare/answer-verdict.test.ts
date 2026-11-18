import { describe, expect, it } from 'vitest';

import { answerVerdict } from '../../../../../../src/renderer/features/requests/lib/compare/answer-verdict.js';
import { httpResponseWith, textBody } from '../../../../../unit-dom/support/http-response.js';

const SCHEMA = '{"properties": {"id": {"type": "string"}}}';

function answer(body: string, status = 200) {
    return httpResponseWith({ body: textBody(body), status });
}

describe('an answer against the schema it answers to (answerVerdict)', () => {
    it('hands the schema and the rules the answer breaks', () => {
        expect(answerVerdict(SCHEMA, answer('{"id":1}'))).toEqual({
            issues: [expect.objectContaining({ path: '/id', schemaPath: '/properties/id/type' })],
            judged: '{"id":1}',
            text: SCHEMA,
        });
    });

    it('breaks nothing under a schema it keeps, or one that cannot be read', () => {
        expect(answerVerdict(SCHEMA, answer('{"id":"a"}'))?.issues).toEqual([]);
        expect(answerVerdict('{"type":', answer('{"id":1}'))?.issues).toEqual([]);
    });

    it('answers nothing without a schema', () => {
        expect(answerVerdict(undefined, answer('{}'))).toBeUndefined();
        expect(answerVerdict('  ', answer('{}'))).toBeUndefined();
    });
});

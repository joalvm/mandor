import { describe, expect, it } from 'vitest';

import { acceptedExample } from '../../../../../../src/renderer/features/requests/lib/compare/accept-received.js';
import { httpResponseWith, textBody } from '../../../../../unit-dom/support/http-response.js';

const EXAMPLE = {
    body: '{"id":1}',
    contentType: 'application/json',
    name: 'Creado',
    request: { description: 'with a body' },
    status: '201',
};

describe('the received response taken as the expected one (acceptedExample)', () => {
    it('takes the status, the type and the body of what came', () => {
        const response = httpResponseWith({ body: textBody('{"id":2}'), status: 200 });
        const accepted = acceptedExample(EXAMPLE, response);

        expect(accepted.status).toBe('200');
        expect(accepted.body).toBe('{"id":2}');
    });

    it('keeps its name and what its request changes', () => {
        const accepted = acceptedExample(EXAMPLE, httpResponseWith({ status: 200 }));

        expect(accepted.name).toBe('Creado');
        expect(accepted.request).toEqual({ description: 'with a body' });
    });

    it('takes the headers and the cookies, and drops the ones that no longer came', () => {
        const withHeaders = { ...EXAMPLE, headers: [['x-old', '1']] as [string, string][] };
        const accepted = acceptedExample(withHeaders, httpResponseWith({ status: 200 }));

        expect(accepted.headers).toBeUndefined();
        expect(accepted.cookies).toBeUndefined();
    });
});

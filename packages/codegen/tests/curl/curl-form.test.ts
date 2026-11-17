import { describe, expect, it } from 'vitest';

import { CurlParseError } from '../../src/curl/curl-parse-error.js';
import { formBody } from '../../src/curl/curl-form.js';
import type { FormPart } from '../../src/curl/curl-body-part.js';

function form(value: string, kind: FormPart['kind'] = 'form'): FormPart {
    return {
        flag: '-F',
        kind,
        value,
    };
}

describe('the fields of a curl form', () => {
    it('reads a text field up to the first equals sign', () => {
        expect(formBody([form('name=ana=1')])).toEqual({
            body: {
                type: 'form',
                fields: [{ key: 'name', value: 'ana=1', enabled: true, kind: 'text' }],
            },
            notices: [],
        });
    });

    it('cuts the value at the first modifier', () => {
        const fields = (value: string) => {
            const { body } = formBody([form(value)]);

            return body.type === 'form' ? body.fields.map((field) => field.value) : [];
        };

        expect(fields('a=b;type=text/plain')).toEqual(['b']);
        expect(fields('a=b;filename=x')).toEqual(['b']);
        expect(fields('a=b;headers=X: y')).toEqual(['b']);
        expect(fields('a=b;encoder=base64')).toEqual(['b']);
        expect(fields('a=b;c')).toEqual(['b;c']);
    });

    it('keeps a file of the repo as a file field and asks to copy it', () => {
        expect(formBody([form('doc=@docs/a.pdf;type=application/pdf')])).toEqual({
            body: {
                type: 'form',
                fields: [{ key: 'doc', value: 'docs/a.pdf', enabled: true, kind: 'file' }],
            },
            notices: [{ code: 'formFileCopy', subject: 'docs/a.pdf' }],
        });
    });

    it('leaves out a file with a path outside the repo', () => {
        expect(formBody([form('doc=@/etc/passwd'), form('d2=@../x')])).toEqual({
            body: { type: 'form', fields: [] },
            notices: [
                { code: 'formFilePath', subject: 'doc' },
                { code: 'formFilePath', subject: 'd2' },
            ],
        });
    });

    it('leaves out a field that reads its text from a file', () => {
        expect(formBody([form('note=<note.txt')])).toEqual({
            body: { type: 'form', fields: [] },
            notices: [{ code: 'formFileContent', subject: 'note' }],
        });
    });

    it('takes --form-string as text without looking at @, < or ;', () => {
        const { body, notices } = formBody([form('a=@x;type=y', 'form-string')]);

        expect(notices).toEqual([]);
        expect(body).toEqual({
            type: 'form',
            fields: [{ key: 'a', value: '@x;type=y', enabled: true, kind: 'text' }],
        });
    });

    it('refuses a field with no equals sign', () => {
        expect(() => formBody([form('nope')])).toThrow(
            expect.objectContaining({ reason: 'syntax', subject: '--form' }),
        );
        expect(() => formBody([form('nope', 'form-string')])).toThrow(CurlParseError);
        expect(() => formBody([form('nope', 'form-string')])).toThrow(
            expect.objectContaining({ subject: '--form-string' }),
        );
    });
});

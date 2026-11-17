import { documentYamlOf } from '@mandor/interop-core';
import { describe, expect, it } from 'vitest';

import { irToDocument } from '../../../src/openapi/export/interop-to-document.js';
import { documentToInterop } from '../../../src/openapi/import/document-to-interop.js';

const DOCUMENT = `
openapi: 3.1.0
info: { title: Tienda, version: 1.0.0 }
paths:
  /pets:
    post:
      operationId: crearMascota
      responses:
        '201':
          description: creada
          content:
            application/json:
              schema:
                type: object
                properties: { id: { type: integer } }
              example: { id: 1 }
        '400':
          description: mala
          content:
            application/json:
              schema: { type: string }
`;

describe('the schema of each example through import and export', () => {
    it('reads the schema of each status into its examples, and makes one where none is shown', async () => {
        const ir = await documentToInterop(DOCUMENT);
        const responses = ir.operations[0]?.http?.responses ?? [];

        expect(responses.map((response) => response.status)).toEqual(['201', '400']);
        expect(JSON.parse(responses[1]?.schema ?? '')).toEqual({ type: 'string' });
    });

    it('writes it back in the status that owned it, and reads the same again', async () => {
        const first = await documentToInterop(DOCUMENT);
        const written = documentYamlOf(irToDocument(first));
        const second = await documentToInterop(written);

        expect(written).toContain('type: string');
        expect(second.operations[0]?.http?.responses).toEqual(first.operations[0]?.http?.responses);
    });
});

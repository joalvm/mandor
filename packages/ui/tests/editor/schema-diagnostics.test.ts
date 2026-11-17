import { describe, expect, it } from 'vitest';

import { schemaDiagnostics } from '../../src/editor/schema-diagnostics.js';

const SCHEMA = '{"type": "object", "required": ["id"], "properties": {"id": {"type": "number"}}}';

describe('the schema marks of a payload', () => {
    it('answers nothing while there is no schema to check against', () => {
        expect(schemaDiagnostics('{"id": 1}', '')).toEqual([]);
        expect(schemaDiagnostics('{"id": 1}', '   ')).toEqual([]);
    });

    it('answers nothing for a payload that meets the schema', () => {
        expect(schemaDiagnostics('{"id": 1}', SCHEMA)).toEqual([]);
    });

    it('lands on the value that does not meet the schema', () => {
        const diagnostics = schemaDiagnostics('{"id": "uno"}', SCHEMA);

        expect(diagnostics).toHaveLength(1);
        expect(diagnostics[0]).toMatchObject({ from: 7, to: 12, severity: 'error' });
    });

    it('walks into the objects of the payload to find the field', () => {
        const diagnostics = schemaDiagnostics(
            '{"user": {"name": 5}}',
            '{"type": "object", "properties": {"user": {"type": "object", "properties": {"name": {"type": "string"}}}}}',
        );

        expect(diagnostics).toHaveLength(1);
        expect(diagnostics[0]).toMatchObject({ from: 18, to: 19 });
    });

    it('marks the whole document when the payload itself is what fails', () => {
        const diagnostics = schemaDiagnostics('{}', SCHEMA);

        expect(diagnostics).toHaveLength(1);
        expect(diagnostics[0]).toMatchObject({ from: 0, to: 2 });
    });

    it('keeps quiet about a template, which stands for whatever the schema asks for', () => {
        expect(schemaDiagnostics('{"id": "{{pedidoId}}"}', SCHEMA)).toEqual([]);
    });

    it('keeps quiet while the body cannot be read, which is the syntax linter’s business', () => {
        expect(schemaDiagnostics('{"id": {{pedidoId}}}', SCHEMA)).toEqual([]);
    });

    it('reads a payload that carries comments', () => {
        const diagnostics = schemaDiagnostics('{ /* nada */ }', SCHEMA);

        expect(diagnostics).toHaveLength(1);
        expect(diagnostics[0]).toMatchObject({ from: 0, to: 14 });
    });

    it('tells that the schema itself is broken instead of saying nothing', () => {
        const diagnostics = schemaDiagnostics('{"id": 1}', '{"required": "nope"}');

        expect(diagnostics).toHaveLength(1);
        expect(diagnostics[0]).toMatchObject({ from: 0, to: 9, severity: 'warning' });
        expect(String(diagnostics[0]?.message)).toContain('required');
    });
});

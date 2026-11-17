import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { BrunoParseError } from '../../../src/bruno/document/bruno-parse-error.js';
import { parseOcFile } from '../../../src/bruno/document/parse-oc-file.js';

const SCHEMA = z.object({ name: z.string() });

describe('parseOcFile', () => {
    it('reads the YAML of a file as the schema reads it', () => {
        expect(parseOcFile({ path: 'a.yml', text: 'name: x\nother: 1\n' }, SCHEMA)).toEqual({
            name: 'x',
        });
    });

    it('says the file is not YAML when it is not a record', () => {
        expect(() => parseOcFile({ path: 'a.yml', text: '- a\n' }, SCHEMA)).toThrow(
            new BrunoParseError(['a.yml: the file is not YAML']),
        );
        expect(() => parseOcFile({ path: 'a.yml', text: 'a: [' }, SCHEMA)).toThrow(
            'a.yml: the file is not YAML',
        );
    });

    it('says which key the schema refuses', () => {
        expect(() => parseOcFile({ path: 'a.yml', text: 'name: 1\n' }, SCHEMA)).toThrow(
            'a.yml: name: Invalid input: expected string, received number',
        );
    });
});

import { describe, expect, it } from 'vitest';

import { BrunoParseError } from '../../../src/bruno/document/bruno-parse-error.js';
import type { BrunoNode } from '../../../src/bruno/document/bruno-tree.js';
import { readOpenCollection } from '../../../src/bruno/document/read-opencollection.js';
import { folderFilesWithout } from '../support/fixture.js';

function file(path: string, text: string) {
    return { path, text };
}

const ROOT = file('opencollection.yml', 'opencollection: 1.0.0\ninfo:\n  name: Tienda\n');

function namesOf(nodes: readonly BrunoNode[]): string[] {
    return nodes.map((node) => `${node.kind}:${node.name}`);
}

describe('readOpenCollection: other shapes of the same layout', () => {
    it('reads a collection whose items and environments are written in its own file', () => {
        const text = [
            'opencollection: 1.0.0',
            'info:',
            '  name: Empaquetada',
            '  summary: Un resumen',
            'config:',
            '  environments:',
            '    - name: Dev',
            '      variables:',
            '        - name: a',
            '          value: 1',
            '    - variables: []',
            'items:',
            '  - info:',
            '      name: Pedir',
            '    http:',
            '      url: u',
            '',
        ].join('\n');
        const document = readOpenCollection([file('opencollection.yml', text)]);

        expect(document.description).toBe('Un resumen');
        expect(namesOf(document.children)).toEqual(['request:Pedir']);
        expect(document.environments.map((environment) => environment.name)).toEqual([
            'Dev',
            'Environment 2',
        ]);
        expect(document.environments[0]?.variables[0]?.value).toBe('1');
    });

    it('reads a collection with nothing in it', () => {
        expect(readOpenCollection([ROOT])).toMatchObject({
            name: 'Tienda',
            description: '',
            children: [],
            environments: [],
            skipped: [],
            auth: undefined,
        });
    });

    it('calls an environment of the folder as its file when it names none', () => {
        const document = readOpenCollection([
            ROOT,
            file('environments/Staging.yml', 'variables: []\n'),
        ]);

        expect(document.environments).toEqual([{ name: 'Staging', variables: [] }]);
    });

    it('has no name for a collection that wrote none', () => {
        const document = readOpenCollection([
            file('opencollection.yml', 'opencollection: 1.0.0\n'),
        ]);

        expect(document.name).toBe('');
    });

    it('ignores the files that are not YAML', () => {
        const document = readOpenCollection([ROOT, file('notas.txt', 'x'), file('x/y.bru', 'x')]);

        expect(document.children).toEqual([]);
    });
});

describe('readOpenCollection: files that cannot be read', () => {
    it('says the root file is missing', () => {
        expect(() => readOpenCollection(folderFilesWithout('oc', 'opencollection.yml'))).toThrow(
            new BrunoParseError(['opencollection.yml: the file is missing']),
        );
    });

    it('says which file is not YAML', () => {
        expect(() => readOpenCollection([file('opencollection.yml', '- a\n')])).toThrow(
            'opencollection.yml: the file is not YAML',
        );
        expect(() => readOpenCollection([ROOT, file('environments/E.yml', '- a\n')])).toThrow(
            'environments/E.yml: the file is not YAML',
        );
    });

    it('says which key of the root file is wrong', () => {
        expect(() =>
            readOpenCollection([file('opencollection.yml', 'opencollection: 1.0.0\nitems: x\n')]),
        ).toThrow('opencollection.yml: items: Invalid input: expected array, received string');
    });
});

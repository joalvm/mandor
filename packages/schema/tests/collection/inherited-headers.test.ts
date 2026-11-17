import { describe, expect, it } from 'vitest';

import type { FolderChainLevel } from '../../src/collection/folder-chain-level.js';
import { inheritedHeaders } from '../../src/collection/inherited-headers.js';
import type { RequestLine } from '../../src/request/request-line.js';

function line(key: string, value: string, enabled = true): RequestLine {
    return { key, value, enabled };
}

function level(name: string, headers?: RequestLine[]): FolderChainLevel {
    return {
        level: 'folder',
        place: { kind: 'folder', path: name.toLowerCase() },
        name,
        settings: headers === undefined ? {} : { headers },
    };
}

const WORKSPACE: FolderChainLevel = {
    level: 'workspace',
    place: { kind: 'workspace' },
    name: 'Pagos',
    settings: {},
};

describe('the headers a request inherits from its folders', () => {
    it('sends the lines of every level, the farthest first, and then its own', () => {
        const merge = inheritedHeaders(
            [
                level('Altas', [line('X-Folder', 'f')]),
                level('Api', [line('X-Api', 'a')]),
                WORKSPACE,
            ],
            [line('X-Own', 'o')],
        );

        expect(merge.sent).toEqual([line('X-Api', 'a'), line('X-Folder', 'f'), line('X-Own', 'o')]);
        expect(merge.inherited).toEqual([
            { line: line('X-Api', 'a'), label: 'Api' },
            { line: line('X-Folder', 'f'), label: 'Altas' },
        ]);
    });

    it('lets the closest level win by name, whatever the case, and says who overrode', () => {
        const merge = inheritedHeaders(
            [level('Altas', [line('x-team', 'b')]), level('Api', [line('X-Team', 'a')])],
            [],
        );

        expect(merge.sent).toEqual([line('x-team', 'b')]);
        expect(merge.inherited[0]).toEqual({
            line: line('X-Team', 'a'),
            label: 'Api',
            overriddenBy: { by: 'level', name: 'Altas' },
        });
    });

    it('lets the own line of the request win over every level', () => {
        const merge = inheritedHeaders(
            [level('Altas', [line('X-Team', 'b')]), level('Api', [line('X-Team', 'a')])],
            [line('X-TEAM', 'c')],
        );

        expect(merge.sent).toEqual([line('X-TEAM', 'c')]);
        expect(merge.inherited.map((header) => header.overriddenBy)).toEqual([
            { by: 'request' },
            { by: 'request' },
        ]);
    });

    it('neither inherits nor lets override a disabled line, nor one with no name', () => {
        const merge = inheritedHeaders(
            [
                level('Altas', [line('X-Team', 'b', false), line('', 'nadie')]),
                level('Api', [line('X-Team', 'a'), line('X-Off', 'x', false)]),
            ],
            [line('X-Team', 'c', false)],
        );

        expect(merge.inherited).toEqual([{ line: line('X-Team', 'a'), label: 'Api' }]);
        expect(merge.sent).toEqual([line('X-Team', 'a'), line('X-Team', 'c', false)]);
    });

    it('keeps the repeated lines of one level, all and in their order', () => {
        const merge = inheritedHeaders(
            [level('Api', [line('Accept', 'application/json'), line('Accept', 'text/plain')])],
            [],
        );

        expect(merge.sent).toEqual([
            line('Accept', 'application/json'),
            line('Accept', 'text/plain'),
        ]);
    });

    it('sends only its own lines when no level declares any', () => {
        const own = [line('X-Own', 'o')];

        expect(inheritedHeaders([level('Api'), WORKSPACE], own)).toEqual({
            inherited: [],
            sent: own,
        });
    });
});

import { describe, expect, it } from 'vitest';

import { FormatError, parseWorkspace } from '../../src/index.js';

const validWorkspace = { id: 'api-pagos', kind: 'sync', name: 'Api Pagos' };

describe('parseWorkspace', () => {
    it('accepts a valid workspace', () => {
        expect(parseWorkspace(validWorkspace)).toEqual(validWorkspace);
    });

    it('rejects an unknown kind', () => {
        expect(() => {
            parseWorkspace({ ...validWorkspace, kind: 'hybrid' });
        }).toThrow(FormatError);
    });

    it('rejects an id that is not a safe path segment', () => {
        expect(() => {
            parseWorkspace({ ...validWorkspace, id: '../escape' });
        }).toThrow(/id/);
    });

    it('accepts unknown keys but strips them from parsed domain data', () => {
        expect(parseWorkspace({ ...validWorkspace, collection: 'future-field' })).toEqual(
            validWorkspace,
        );
    });

    it('keeps the auth of the workspace when the file is read and written again', () => {
        const auth = { type: 'bearer', token: '{{token}}' };

        const workspace = parseWorkspace({ ...validWorkspace, auth });

        expect(workspace.auth).toEqual(auth);
        expect(parseWorkspace(workspace)).toEqual({ ...validWorkspace, auth });
    });

    it('keeps the origin of what an import wrote into the workspace file', () => {
        const importOrigin = { kind: 'openapi', sourceId: 'abc', fingerprint: 'f1' };

        expect(parseWorkspace({ ...validWorkspace, importOrigin }).importOrigin).toEqual(
            importOrigin,
        );
        expect(parseWorkspace(validWorkspace).importOrigin).toBeUndefined();
    });

    it('keeps the scripts an import brought and leaves them absent when the file has none', () => {
        const importedScripts = [{ event: 'onResponse', dialect: 'postman', source: 'a()' }];

        expect(parseWorkspace({ ...validWorkspace, importedScripts }).importedScripts).toEqual(
            importedScripts,
        );
        expect(parseWorkspace(validWorkspace).importedScripts).toBeUndefined();
    });

    it('leaves out the variables an older build kept: the workspace holds none', () => {
        const variables = [{ name: 'host', value: 'api.test', enabled: true, secret: false }];

        expect(parseWorkspace({ ...validWorkspace, variables })).not.toHaveProperty('variables');
    });

    it('reads the environment that rules when nobody chose one', () => {
        expect(
            parseWorkspace({ ...validWorkspace, defaultEnvironment: 'base' }).defaultEnvironment,
        ).toBe('base');
    });
});

import { createEnvironment } from '@mandor/schema';
import { describe, expect, it } from 'vitest';

import { editorVariables } from '../src/lib/editor-variables.js';
import { windowScope } from '../src/lib/window-scope.js';

const ENVIRONMENT = createEnvironment({
    id: 'local',
    name: 'local',
    variables: [{ name: 'deviceType', value: '2', enabled: true, secret: false }],
});

describe('the variables of a document', () => {
    it('names the tokens the text holds, with the offsets they cover', () => {
        const { variablesOf } = editorVariables(windowScope(ENVIRONMENT, [], []), () => undefined);

        expect(variablesOf('{"type":"{{deviceType}}"}')).toEqual([
            { from: 9, to: 23, tone: 'resolved', name: 'deviceType' },
        ]);
    });

    it('drops the tokens the environment gives no tone to', () => {
        const { variablesOf } = editorVariables(windowScope(ENVIRONMENT, [], []), () => undefined);

        expect(variablesOf('{"plain":1}')).toEqual([]);
    });

    it('tints a token only the workspace declares', () => {
        const { variablesOf } = editorVariables(
            windowScope(
                undefined,
                [{ name: 'host', value: '127.0.0.1', enabled: true, secret: false }],
                [],
            ),
            () => undefined,
        );

        expect(variablesOf('{{host}}')).toEqual([
            { from: 0, to: 8, tone: 'resolved', name: 'host' },
        ]);
    });

    it('tints a token nobody declares as missing', () => {
        const { variablesOf } = editorVariables(windowScope(ENVIRONMENT, [], []), () => undefined);

        expect(variablesOf('{"email":"{{email}}"}')).toEqual([
            { from: 10, to: 19, tone: 'missing', name: 'email' },
        ]);
    });

    it('carries the hover report it was given', () => {
        const onHover = () => undefined;

        expect(editorVariables(windowScope(ENVIRONMENT, [], []), onHover).onHover).toBe(onHover);
    });
});

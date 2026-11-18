import { createEnvironment } from '@mandor/schema';
import { resolveText } from '@mandor/vars';
import { describe, expect, it } from 'vitest';

import { declaredNames, windowScope } from '../src/lib/window-scope.js';

const ENVIRONMENT = createEnvironment({
    id: 'prod',
    name: 'Prod',
    variables: [
        { name: 'level', value: 'entorno', enabled: true, secret: false },
        { name: 'off', value: 'x', enabled: false, secret: false },
    ],
});

describe('the scope a field of the window resolves against', () => {
    it('lets a folder of the item override the environment, as main does', () => {
        const scope = windowScope(
            ENVIRONMENT,
            [],
            [
                {
                    level: 'folder',
                    place: { kind: 'folder', path: 'pagos/altas' },
                    name: 'Altas',
                    settings: {
                        variables: [
                            { name: 'level', value: 'carpeta', enabled: true, secret: false },
                        ],
                    },
                },
            ],
        );

        expect(resolveText('{{level}}', scope).text).toBe('carpeta');
    });

    it('names every declared name once, strongest first, and leaves out what is switched off', () => {
        const scope = windowScope(
            ENVIRONMENT,
            [{ name: 'host', value: 'h', enabled: true, secret: false }],
            [
                {
                    level: 'collection',
                    place: { kind: 'folder', path: 'pagos' },
                    name: 'Pagos',
                    settings: {
                        variables: [{ name: 'level', value: 'c', enabled: true, secret: false }],
                    },
                },
            ],
        );

        expect(declaredNames(scope)).toEqual(['level', 'host']);
    });

    /** What a script set is the strongest level, and the window only knows its preview. */
    it('lets what a script set win over the environment, with its preview as the value', () => {
        const scope = windowScope(ENVIRONMENT, [], [], [{ name: 'level', preview: 'del script' }]);

        expect(resolveText('{{level}}', scope).text).toBe('del script');
        expect(declaredNames(scope)).toEqual(['level']);
    });
});

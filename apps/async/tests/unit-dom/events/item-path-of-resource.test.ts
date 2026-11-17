import { formatResourceUri } from '@mandor/schema';
import { describe, expect, it } from 'vitest';

import { itemPathOfResource } from '../../../src/renderer/events/item-path-of-resource.js';

describe('itemPathOfResource', () => {
    it('reads the path of a collection item', () => {
        const resource = formatResourceUri({
            scope: 'workspace',
            repo: 'local',
            workspace: 'eventos',
            kind: 'item',
            path: 'pagos/altas/creado',
        });

        expect(itemPathOfResource(resource)).toBe('pagos/altas/creado');
    });

    it('answers null for free text and for what is not an item', () => {
        const connection = formatResourceUri({
            scope: 'workspace',
            repo: 'local',
            workspace: 'eventos',
            kind: 'connection',
            path: 'eco',
        });

        expect(itemPathOfResource('')).toBeNull();
        expect(itemPathOfResource(connection)).toBeNull();
    });
});

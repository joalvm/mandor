import { describe, expect, it } from 'vitest';

import { documentSourceId } from '../../../src/insomnia/document/document-source-id.js';

describe('documentSourceId', () => {
    it('is the id Insomnia gave the workspace, so a re-import is an update', () => {
        expect(documentSourceId('wrk_1', 'Tienda')).toBe('workspace:wrk_1');
        expect(documentSourceId('wrk_1', 'Renamed')).toBe('workspace:wrk_1');
    });

    it('is told by the name, without case or margins, when the file has no id', () => {
        const byName = documentSourceId(undefined, 'Tienda');

        expect(byName).toMatch(/^workspace:[0-9a-f]{64}$/);
        expect(documentSourceId(null, '  TIENDA ')).toBe(byName);
        expect(documentSourceId('', 'tienda')).toBe(byName);
        expect(documentSourceId(undefined, 'Otra')).not.toBe(byName);
    });
});

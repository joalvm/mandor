import { describe, expect, it } from 'vitest';

import { composeScope, traceVariable } from '../../src/index.js';

describe('traceVariable', () => {
    const scope = composeScope({
        chain: [
            { level: 'folder', name: 'Pagos', values: { host: 'pagos.local' } },
            { level: 'collection', name: 'API', values: { host: 'api.local', base: '/v1' } },
        ],
        environment: { host: 'prod.example', token: 'tok' },
        secret: ['token'],
    });

    it('names the level that wins and every level it shadows', () => {
        expect(traceVariable(scope, 'host')).toEqual({
            winner: { level: 'folder', label: 'Pagos', value: 'pagos.local', secret: false },
            shadowed: [{ level: 'environment' }, { level: 'collection', label: 'API' }],
        });
    });

    it('says a secret is secret and that it shadows nothing when nobody else has it', () => {
        expect(traceVariable(scope, 'token')).toEqual({
            winner: { level: 'environment', value: 'tok', secret: true },
            shadowed: [],
        });
    });

    it('answers nothing for a name no level defines', () => {
        expect(traceVariable(scope, 'missing')).toBeUndefined();
    });
});

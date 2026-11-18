import { describe, expect, it } from 'vitest';

import { spreadIntoEnvironments } from '../../src/environment/spread-into-environments.js';

function plain(name: string, value: string, enabled = true) {
    return { name, value, enabled, secret: false };
}

const BASE = { id: 'b4s3', name: 'Base' };

describe('spreadIntoEnvironments', () => {
    it('gives each environment the names it lacks, keeps its own and leaves the rest alone', () => {
        const spread = spreadIntoEnvironments(
            [plain('host', 'ws.local'), plain('page', '1'), plain('off', 'x', false)],
            [
                { id: 'prod', name: 'Prod', variables: [plain('host', 'prod.example')] },
                {
                    id: 'dev',
                    name: 'Dev',
                    variables: [plain('host', 'dev.example'), plain('page', '9')],
                },
            ],
            BASE,
        );

        expect(spread.environments[0]?.variables).toEqual([
            plain('host', 'prod.example'),
            plain('page', '1'),
        ]);
        expect(spread.changed).toEqual(['prod']);
        expect(spread.base).toEqual({
            id: 'b4s3',
            name: 'Base',
            variables: [plain('host', 'ws.local'), plain('page', '1'), plain('off', 'x', false)],
        });
    });

    it('switches on, with the value that resolved, a declaration that was switched off', () => {
        const spread = spreadIntoEnvironments(
            [plain('host', 'ws.local')],
            [
                {
                    id: 'prod',
                    name: 'Prod',
                    variables: [{ name: 'host', value: '', enabled: false, secret: true }],
                },
            ],
            BASE,
        );

        expect(spread.environments[0]?.variables).toEqual([plain('host', 'ws.local')]);
    });

    it('keeps an active secret of the environment, which already won', () => {
        const secret = { name: 'token', value: '', enabled: true, secret: true };
        const spread = spreadIntoEnvironments(
            [plain('token', 'from-workspace')],
            [{ id: 'prod', name: 'Prod', variables: [secret] }],
            BASE,
        );

        expect(spread.environments[0]?.variables).toEqual([secret]);
        expect(spread.changed).toEqual([]);
    });
});

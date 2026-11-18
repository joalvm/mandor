import { describe, expect, it } from 'vitest';

import {
    alignedIds,
    linesOfVariables,
    variablesOfLines,
} from '../src/components/key-value/environment-lines.js';

describe('the lines of the variables of an environment', () => {
    it('carries each variable to a line: the switch flips, the mark of secret rides along', () => {
        expect(
            linesOfVariables(
                [
                    {
                        enabled: true,
                        name: 'base_url',
                        secret: false,
                        value: 'http://localhost:81',
                    },
                    { enabled: false, name: 'api_token', secret: true, value: 'hx7_qW2mRt9vL4pX' },
                ],
                ['4', '9'],
            ),
        ).toEqual([
            {
                disabled: false,
                id: '4',
                name: 'base_url',
                secret: false,
                value: 'http://localhost:81',
            },
            { disabled: true, id: '9', name: 'api_token', secret: true, value: 'hx7_qW2mRt9vL4pX' },
        ]);
    });

    it('brings the lines home as variables: nothing kept, nothing invented', () => {
        expect(
            variablesOfLines([
                { disabled: false, id: '0', name: 'base_url', secret: undefined, value: 'x' },
                { disabled: true, id: '1', name: 'api_token', secret: true, value: 'tok' },
            ]),
        ).toEqual([
            { enabled: true, name: 'base_url', secret: false, value: 'x' },
            { enabled: false, name: 'api_token', secret: true, value: 'tok' },
        ]);
    });

    it('gives a line the list grew by an identity none of the standing ones holds', () => {
        const variable = { enabled: true, name: 'nueva', secret: false, value: '' };

        expect(linesOfVariables([variable, variable], ['4']).map((line) => line.id)).toEqual([
            '4',
            '5',
        ]);
    });

    it('keeps the identity of a position while the list grows or shrinks around it', () => {
        expect(alignedIds(['3', '8'], 4)).toEqual(['3', '8', '9', '10']);
        expect(alignedIds(['3', '8', '5'], 2)).toEqual(['3', '8']);
        expect(alignedIds([], 0)).toEqual([]);
        expect(new Set(alignedIds(['3'], 3)).size).toBe(3);
    });
});

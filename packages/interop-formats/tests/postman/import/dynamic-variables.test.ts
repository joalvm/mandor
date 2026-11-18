import { degradation } from '@mandor/interop-core';
import { describe, expect, it } from 'vitest';

import { withDynamicFields } from '../../../src/postman/import/dynamic-variables.js';

describe('the dynamic variables of the fields of a resource', () => {
    it.each([
        ['{{$guid}}', '{{$uuid}}'],
        ['{{$randomUUID}}', '{{$uuid}}'],
        ['{{$timestamp}}', '{{$timestamp}}'],
        ['{{$randomInt}}', '{{$randomInt}}'],
        ['id-{{$guid}}-{{$guid}}', 'id-{{$uuid}}-{{$uuid}}'],
        ['{{plain}}', '{{plain}}'],
    ])('rewrites %s as %s', (from, to) => {
        expect(withDynamicFields({ url: from })).toEqual({ fields: { url: to }, notes: [] });
    });

    it('names a variable it does not know once, in order, and leaves it as text', () => {
        const url = '{{$randomEmail}} {{$guid}} {{$randomName}} {{$randomEmail}}';

        expect(withDynamicFields({ url })).toEqual({
            fields: { url: '{{$randomEmail}} {{$uuid}} {{$randomName}} {{$randomEmail}}' },
            notes: [
                degradation('dynamicVariableUnsupported', { name: '$randomEmail' }),
                degradation('dynamicVariableUnsupported', { name: '$randomName' }),
            ],
        });
    });

    it('goes through arrays and plain objects, and leaves the rest as it is', () => {
        const body = { a: ['{{$guid}}', 1, null, { b: '{{$timestamp}}' }], c: true };

        expect(withDynamicFields({ body }).fields).toEqual({
            body: { a: ['{{$uuid}}', 1, null, { b: '{{$timestamp}}' }], c: true },
        });
    });
});

describe('withDynamicFields', () => {
    it('maps the fields and says what it could not, but never touches the scripts', () => {
        const importedScripts = [{ event: 'onResponse', dialect: 'postman', source: '{{$guid}}' }];
        const mapped = withDynamicFields({ url: '{{$guid}}/{{$nope}}', importedScripts });

        expect(mapped.fields).toEqual({ url: '{{$uuid}}/{{$nope}}', importedScripts });
        expect(mapped.notes).toEqual([
            degradation('dynamicVariableUnsupported', { name: '$nope' }),
        ]);
        expect(withDynamicFields({ url: 'x' }).fields).toEqual({ url: 'x' });
    });
});

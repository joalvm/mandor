import { degradation } from '../../src/resource/degradation.js';
import { describe, expect, it } from 'vitest';

import { fingerprintOf } from '../../src/plan/fingerprint-of.js';
import { importPlan } from '../../src/plan/import-plan.js';
import { leaveOutUnstored } from '../../src/plan/leave-out-unstored.js';
import { collectionFingerprint } from '../../src/resource/collection-fingerprint.js';
import type { ImportResource } from '../../src/resource/import-resource.js';

const origin = { kind: 'insomnia', sourceId: 'wrk:1' } as const;
const ALL = ['description', 'variables', 'auth', 'headers'] as const;
const AUTH = { type: 'bearer', token: '{{t}}' };
const HEADER = { key: 'X-A', value: '1', enabled: true };

function resource(overrides: Partial<ImportResource>): ImportResource {
    return {
        place: 'item',
        itemKind: 'request',
        route: 'tienda/lista',
        name: 'Lista',
        fields: {},
        origin,
        degradations: [],
        ...overrides,
    };
}

const PLAN = importPlan(
    [
        resource({ place: 'collection', itemKind: null, route: 'tienda', name: 'Tienda' }),
        resource({}),
        resource({ itemKind: 'message', route: 'tienda/hola', name: 'Hola' }),
        resource({ place: 'connection', itemKind: null, route: 'vivo', name: 'Vivo' }),
    ],
    [],
    () => 'minted',
);

function marksOf(stores: Parameters<typeof leaveOutUnstored>[1]) {
    return leaveOutUnstored(PLAN, stores, ALL).entries.map((entry) => [entry.name, entry.selected]);
}

describe('leaveOutUnstored', () => {
    it('keeps marked what the app keeps, and the structure whatever the app keeps', () => {
        expect(marksOf(['request'])).toEqual([
            ['Tienda', true],
            ['Lista', true],
            ['Hola', false],
            ['Vivo', false],
        ]);
        expect(marksOf(['message', 'connection'])).toEqual([
            ['Tienda', true],
            ['Lista', false],
            ['Hola', true],
            ['Vivo', true],
        ]);
    });

    it('says why a leaf is out, in the words of what it is', () => {
        const entries = leaveOutUnstored(PLAN, ['request'], ALL).entries;

        expect(entries.map((entry) => entry.leftOut)).toEqual([
            undefined,
            undefined,
            degradation('leftOutMessages'),
            degradation('leftOutConnections'),
        ]);
    });

    it('keeps what the format said apart from why the app leaves the leaf out', () => {
        const noted = importPlan(
            [resource({ degradations: [degradation('pkceAlways')] })],
            [],
            () => 'minted',
        );
        const [entry] = leaveOutUnstored(noted, ['connection'], ALL).entries;

        expect(entry?.resource?.degradations).toEqual([degradation('pkceAlways')]);
        expect(entry?.leftOut).toEqual(degradation('leftOutRequests'));
    });

    it('leaves alone an entry that writes nothing', () => {
        const plan = importPlan(
            [resource({ place: 'connection', itemKind: null, route: 'vivo', name: 'Vivo' })],
            [{ place: 'item', route: 'tienda/lista', name: 'Lista', origin }],
            () => 'minted',
        );
        const removal = plan.entries.find((entry) => entry.class === 'removal');
        const left = leaveOutUnstored(plan, ['connection'], ALL).entries;

        expect(removal?.resource).toBeNull();
        expect(left).toEqual(plan.entries);
    });

    describe('what an app keeps of a collection or a folder', () => {
        function level(place: 'collection' | 'folder', fields: Record<string, unknown>) {
            const route = place === 'collection' ? 'tienda' : 'tienda/a';
            const plan = importPlan(
                [resource({ place, itemKind: null, route, name: 'Uno', fields })],
                [],
                () => 'minted',
            );
            const [entry] = leaveOutUnstored(plan, [], ['description', 'variables']).entries;

            return entry;
        }

        it('takes out what the app does not keep, marked and with a row for each', () => {
            const entry = level('folder', { description: 'd', auth: AUTH, headers: [HEADER] });

            expect(entry?.selected).toBe(true);
            expect(entry?.leftOut).toBeUndefined();
            expect(entry?.resource?.fields).toEqual({ description: 'd' });
            expect(entry?.resource?.degradations).toEqual([
                degradation('folderKeepsNoAuth'),
                degradation('folderKeepsNoHeaders'),
            ]);
        });

        it('hashes a folder by what is written, as if the document never said the rest', () => {
            const entry = level('folder', { description: 'd', auth: AUTH });

            expect(entry?.resource?.origin.fingerprint).toBe(
                fingerprintOf({ name: 'Uno', description: 'd' }),
            );
        });

        it('hashes a collection by what is written, its name included', () => {
            const entry = level('collection', { name: 'Uno', auth: AUTH });

            expect(entry?.resource?.fields).toEqual({ name: 'Uno' });
            expect(entry?.resource?.origin.fingerprint).toBe(
                collectionFingerprint({ name: 'Uno' }),
            );
        });

        it('takes `inherit` out with no row: a level says it by default', () => {
            const entry = level('folder', { auth: { inherit: true } });

            expect(entry?.resource?.fields).toEqual({});
            expect(entry?.resource?.degradations).toEqual([]);
        });

        it('leaves alone a level with nothing to take out, and every other place', () => {
            const kept = level('folder', { description: 'd' });
            const plan = importPlan(
                [
                    resource({
                        place: 'environment',
                        itemKind: null,
                        route: 'prod',
                        fields: { auth: AUTH },
                    }),
                ],
                [],
                () => 'minted',
            );

            expect(kept?.resource?.degradations).toEqual([]);
            expect(kept?.resource?.origin).toEqual(origin);
            expect(leaveOutUnstored(plan, [], []).entries[0]?.resource?.fields).toEqual({
                auth: AUTH,
            });
        });
    });
});

import { describe, expect, it } from 'vitest';

import type { ImportResource } from '../../src/resource/import-resource.js';
import { degradation, type Degradation } from '../../src/resource/degradation.js';
import { withDocumentNotes } from '../../src/resource/with-document-notes.js';

const NOTA = degradation('pkceAlways');
const PROPIA = degradation('fileBodyWithoutFile');

function resource(
    place: ImportResource['place'],
    degradations: Degradation[] = [],
): ImportResource {
    return {
        place,
        itemKind: null,
        route: place,
        name: place,
        fields: {},
        origin: { kind: 'openapi', sourceId: 'a' },
        degradations,
    };
}

function notesOf(resources: readonly ImportResource[]): Degradation[][] {
    return resources.map(({ degradations }) => degradations);
}

describe('withDocumentNotes', () => {
    it('says them on the collection, after what it already says, each once', () => {
        const resources = [resource('connection'), resource('collection', [PROPIA])];

        expect(notesOf(withDocumentNotes(resources, [NOTA, PROPIA]))).toEqual([[], [PROPIA, NOTA]]);
    });

    it('says them on the first resource when the document brought no collection', () => {
        const resources = [resource('environment'), resource('connection')];

        expect(notesOf(withDocumentNotes(resources, [NOTA]))).toEqual([[NOTA], []]);
    });

    it('has nowhere to say them when the document brought nothing', () => {
        expect(withDocumentNotes([], [NOTA])).toEqual([]);
    });
});

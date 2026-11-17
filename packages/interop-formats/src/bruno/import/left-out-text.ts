import { degradation, type Degradation, type DegradationCode } from '@mandor/interop-core';

const NO_PLACE: Record<'request' | 'folder' | 'collection', DegradationCode> = {
    collection: 'noPlaceCollection',
    folder: 'noPlaceFolder',
    request: 'noPlaceRequest',
};

/** What a level of Bruno kept and Mandor has no place for, said once. */
export function leftOutText(
    subject: 'request' | 'folder' | 'collection',
    names: readonly string[],
): Degradation[] {
    return names.length === 0 ? [] : [degradation(NO_PLACE[subject], { names: names.join(', ') })];
}

import { degradation, type Degradation } from '@mandor/interop-core';
import { MAX_EXAMPLES } from './entry-operation.js';

const SAYS = new Map<string, (value: unknown) => Degradation[]>([
    ['mergedEntries', (count) => [degradation('harEntriesCombined', { count: String(count) })]],
    [
        'droppedExamples',
        (count) => [
            degradation('harResponsesCapped', { max: String(MAX_EXAMPLES), count: String(count) }),
        ],
    ],
    [
        'binaryExamples',
        (names) =>
            [names].flat().map((name) => degradation('harResponseBinary', { name: String(name) })),
    ],
    ['binaryBody', (mime) => [degradation('harBodyBinary', { mime: String(mime) })]],
]);

/**
 * What the operation kept that no field of Mandor claims, one sentence per thing. The importer
 * writes only the four keys below, so a key it does not know is not an import's business.
 */
export function extrasDegradations(extras: Record<string, unknown>): Degradation[] {
    return Object.entries(extras).flatMap(([key, value]) => SAYS.get(key)?.(value) ?? []);
}

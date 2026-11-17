import { findNodeAtLocation, getNodeValue, parseTree, type Node } from 'jsonc-parser';

import { allSpotsOf } from '../schema-strictness/schema-spots.js';
import type { TextRange } from '../text-range/range-of-pointer.js';

import { uncheckedPattern } from './pattern-risk.js';

/**
 * Where a schema text writes each pattern the checker leaves out, so the editor of the schema
 * can say so over it: a value it judges is let through that pattern, and whoever wrote it sees
 * why. Read as the checker reads the text, comments and a trailing comma included.
 */
export function uncheckedPatternRanges(source: string): TextRange[] {
    const root = parseTree(source, [], { allowTrailingComma: true });

    if (root === undefined) {
        return [];
    }

    return allSpotsOf(getNodeValue(root))
        .filter(({ schema }) => {
            const pattern = schema['pattern'];

            return typeof pattern === 'string' && uncheckedPattern(pattern);
        })
        .map(({ path }) => findNodeAtLocation(root, [...path, 'pattern']))
        .filter((node): node is Node => node !== undefined)
        .map((node) => ({ from: node.offset, to: node.offset + node.length }));
}

import { type InteropDocument, type InteropOperation, isRecord } from '@mandor/interop-core';

import { domainOfTag } from '../document/group-tag.js';

/**
 * The group an operation belongs to: the domain the document declares, the first plain tag it
 * carries — the operation's own tags first, the message's as a fallback — and the document name
 * when nothing tags it at all. The group is what the import names the folder after.
 */
export function operationGroupOf(operation: InteropOperation, document: InteropDocument): string {
    const tags = tagsOfOperation(operation);

    for (const tag of tags) {
        const domain = domainOfTag(tag);

        if (domain !== undefined) {
            return domain;
        }
    }

    return tags.find((tag) => !tag.includes(':')) ?? document.name;
}

/** The plain tags left once one opened the folder: the item keeps them. */
export function tagsBesideGroup(operation: InteropOperation, group: string): string[] {
    return [...new Set(tagsOfOperation(operation))].filter(
        (tag) => tag !== group && !tag.includes(':') && tag.trim() !== '',
    );
}

function tagsOfOperation(operation: InteropOperation): string[] {
    return [
        ...tagNamesOf(operation.extras['tags']),
        ...tagNamesOf(operation.message?.extras['tags']),
    ];
}

function tagNamesOf(value: unknown): string[] {
    const entries: unknown[] = Array.isArray(value) ? value : [];

    return entries
        .map(tagNameOf)
        .filter((name): name is string => typeof name === 'string' && name.length > 0);
}

/** A tag travels as the object the format asks for, though a bare string says the same. */
function tagNameOf(entry: unknown): unknown {
    if (isRecord(entry)) {
        return entry['name'];
    }

    return entry;
}

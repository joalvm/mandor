import type { ResourceIndex } from '../resource/resource-index.js';

/**
 * Where the section of a strip inside a resource is kept: beside the section of the resource,
 * after a space no address of a resource holds. A resource with one strip names none.
 */
export function sectionKey(resource: string, strip: string | undefined): string {
    return strip === undefined ? resource : `${resource} ${strip}`;
}

/** The resource a kept section belongs to, whether it is its own or that of a strip inside it. */
function ownerOf(key: string): string {
    const space = key.indexOf(' ');

    return space === -1 ? key : key.slice(0, space);
}

/**
 * The sections of the resources that are still open. A resource nobody is looking at any more
 * keeps no say in how it is drawn the day it is opened again, and the map does not grow with
 * every item that was ever read in the window.
 */
export function openSections(
    sections: Record<string, string>,
    resources: ResourceIndex,
): Record<string, string> {
    const kept: Record<string, string> = {};

    for (const [resource, section] of Object.entries(sections)) {
        if (resources[ownerOf(resource)] !== undefined) {
            kept[resource] = section;
        }
    }

    return kept;
}

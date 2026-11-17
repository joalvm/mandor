import type { CollectionItem } from '@mandor/schema';

import type { InteropChannel, InteropOperation } from '../ir/interop-document.js';

/**
 * The channels of the document are the addresses the items speak, not the folders that group
 * them: a folder holds events of one domain, and each of them answers to its own address on
 * the wire. What the item does not address, it names itself.
 */
export function channelsOf(items: readonly CollectionItem[]): InteropChannel[] {
    const channels: InteropChannel[] = [];
    const seen = new Set<string>();

    for (const item of items) {
        if (item.kind === 'request') {
            continue;
        }

        const name = channelNameOf(item);

        if (seen.has(name)) {
            continue;
        }

        seen.add(name);
        channels.push(channelOf(name, [item]));
    }

    return channels;
}

/** One channel per distinct route the request operations name, with nothing to say on it. */
export function requestChannelsOf(operations: readonly InteropOperation[]): InteropChannel[] {
    const channels: InteropChannel[] = [];
    const seen = new Set<string>();

    for (const operation of operations) {
        if (operation.http === undefined || seen.has(operation.channel)) {
            continue;
        }

        seen.add(operation.channel);
        channels.push(channelOf(operation.channel, []));
    }

    return channels;
}

function channelOf(name: string, items: readonly CollectionItem[]): InteropChannel {
    return {
        name,
        address: items.map(addressOf).find((address) => address !== undefined) ?? name,
        extras: {},
    };
}

/** The wire address of a grouping is what its first item names as its channel. */
function addressOf(item: CollectionItem): string | undefined {
    const channel = item.body['channel'];

    return typeof channel === 'string' && channel !== '' ? channel : undefined;
}

/** The name an item answers to: its address on the wire, or its own name when it has none. */
export function channelNameOf(item: CollectionItem): string {
    return addressOf(item) ?? item.name;
}

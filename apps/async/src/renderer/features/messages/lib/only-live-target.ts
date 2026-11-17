import type { OutboundTarget } from '../../../outbound/outbound-port.js';

/** The connection a send takes without asking: the one that is up, when only one is. */
export function onlyLiveTarget(targets: readonly OutboundTarget[]): OutboundTarget | undefined {
    const live = targets.filter((each) => each.live);

    return live.length === 1 ? live[0] : undefined;
}

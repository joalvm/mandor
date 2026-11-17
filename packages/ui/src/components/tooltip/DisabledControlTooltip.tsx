import type { ReactElement } from 'react';

import { Tooltip } from './Tooltip.js';

type DisabledControlTooltipProps = {
    children: ReactElement;
    reason?: string | undefined;
};

/**
 * Keeps a disabled native control hoverable so its reason remains discoverable.
 *
 * The wrapper is the box the surrounding layout sees. As a grid it stretches to the cell a
 * field sits in, so a disabled field keeps the width of the enabled one beside it; as a flex
 * item it still measures its content, so a button with a reason keeps its own size in a band.
 */
export function DisabledControlTooltip({ children, reason }: DisabledControlTooltipProps) {
    if (reason === undefined) {
        return children;
    }

    return (
        <Tooltip content={reason}>
            <span className="inline-grid" data-part="disabled-control">
                {children}
            </span>
        </Tooltip>
    );
}

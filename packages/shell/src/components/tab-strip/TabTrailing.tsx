import { cn, IconButton } from '@mandor/ui';
import type { PropsWithChildren } from 'react';

/** What the end of a tab offers when it is aimed at: closing the tab, or letting go of its pin. */
export type TabTrailingAction = {
    icon: 'close' | 'pinned';
    label: string;
    /** Stays drawn while nothing points at the tab, as long as the kind says no state. */
    rests: boolean;
    run: () => void;
};

/**
 * What is written inside is what the tab says about its thing while nothing points at the tab —
 * a socket that is up, a draft nobody saved. A kind that says nothing writes nothing, and a state
 * that draws nothing right now leaves the place empty.
 */
type TabTrailingProps = PropsWithChildren<{ action?: TabTrailingAction | undefined }>;

/** Both lie in the one cell of the place, so they share a centre whatever their sizes. */
const CELL = 'col-start-1 row-start-1';

/**
 * The end of a tab: one place at its far edge, laid over the name instead of beside it, so a tab
 * at rest spends its whole width on its name and nothing moves under the pointer.
 *
 * The state of the thing and the action of the tab share that place, one over the other with
 * the same centre: at rest the place shows the state, aimed at — by the pointer or the focus —
 * it shows the action. A pin is what says the tab is pinned, so it shows at rest too while there
 * is no state to show. The stylesheet lays a veil under the place whenever something is drawn
 * there, which fades the end of the name into the fill of the tab.
 */
export function TabTrailing({ action, children }: TabTrailingProps) {
    const said = children !== undefined && children !== null;

    if (!said && action === undefined) {
        return null;
    }

    return (
        <span
            className="absolute inset-y-0 end-1 grid items-center justify-items-center"
            data-part="tab-trailing"
        >
            <TabStatus action={action} said={said}>
                {children}
            </TabStatus>
            <TabAction action={action} said={said} />
        </span>
    );
}

type TabStatusProps = PropsWithChildren<{ action: TabTrailingAction | undefined; said: boolean }>;

function TabStatus({ action, children, said }: TabStatusProps) {
    if (!said) {
        return null;
    }

    return (
        <span
            className={cn(
                CELL,
                'peer flex size-icon-md items-center justify-center',
                action !== undefined && 'group-focus-within:invisible group-hover:invisible',
            )}
            data-part="tab-status"
        >
            {children}
        </span>
    );
}

type TabActionProps = { action: TabTrailingAction | undefined; said: boolean };

function TabAction({ action, said }: TabActionProps) {
    if (action === undefined) {
        return null;
    }

    return (
        <IconButton
            className={cn(
                CELL,
                'group-focus-within:visible group-hover:visible',
                action.rests && !said ? 'visible' : 'invisible',
                action.rests && 'peer-empty:visible',
            )}
            icon={action.icon}
            iconSize="sm"
            label={action.label}
            onClick={(event) => {
                event.stopPropagation();
                action.run();
            }}
            onKeyDown={(event) => {
                event.stopPropagation();
            }}
            size="xs"
        />
    );
}

import { AddressField, EnvironmentSelect } from '@mandor/env';
import { ConnectIcon, DisconnectIcon } from '@mandor/icons';
import { useMessages } from '@mandor/i18n';
import type { WsState } from '@mandor/ipc';
import type { Environment, Variable } from '@mandor/schema';
import { AddressBar, AddressEnd, Badge, Button } from '@mandor/ui';

import { useElapsedSince } from '../../hooks/useElapsedSince.js';
import { dotStateFor, type DotState } from '../../lib/dot-state.js';
import { formatElapsed } from '../../lib/format-elapsed.js';

type ConnectionToolbarProps = {
    /** The environment the URL resolves its variables against. */
    environment: Environment | undefined;
    /** The environment the connection chose, which may be one the workspace no longer holds. */
    environmentId: string | null;
    /** The environments the workspace holds: the ones the connection may choose among. */
    environments: readonly Environment[];
    live: boolean;
    onEnvironmentChange: (environmentId: string) => void;
    onToggle: () => void;
    onUrlChange: (url: string) => void;
    onVariablesChange: (variables: readonly Variable[]) => void;
    /** When the socket opened; nothing while it is not open. */
    openedAt: number | undefined;
    pending: boolean;
    url: string;
    wsState: WsState;
    /** The namespace a Socket.IO connection joins; the root one is not worth a chip. */
    namespace?: string | undefined;
};

/**
 * Address bar of the connection: the environment it resolves against, the namespace it joins and
 * the URL it dials, fused the way an address bar is, closed from inside by the state of the
 * socket and the time it has been connected; then the toggle. The recording heads the activity it
 * records. The transport is not here: a connection is made for one, so it is set in its settings
 * and its logo marks the tab.
 */
export function ConnectionToolbar({
    environment,
    environmentId,
    environments,
    live,
    onEnvironmentChange,
    onToggle,
    onUrlChange,
    onVariablesChange,
    openedAt,
    pending,
    url,
    wsState,
    namespace,
}: ConnectionToolbarProps) {
    const messages = useMessages('connections');

    const Glyph = live ? DisconnectIcon : ConnectIcon;

    return (
        <div
            className="flex h-toolbar shrink-0 items-center gap-gap-control pe-2.5 ps-pad-panel"
            data-part="connection-toolbar"
        >
            <AddressBar className="flex-1">
                <EnvironmentSelect
                    onChange={onEnvironmentChange}
                    options={environments}
                    value={environmentId}
                />
                <ConnectionNamespace namespace={namespace} />
                <AddressField
                    environment={environment}
                    label={messages('urlLabel')}
                    onChange={onUrlChange}
                    onVariablesChange={onVariablesChange}
                    value={url}
                />
                <AddressEnd>
                    <ConnectionStatePill openedAt={openedAt} wsState={wsState} />
                </AddressEnd>
            </AddressBar>
            <Button
                loading={pending}
                onClick={onToggle}
                size="lg"
                variant={live ? 'secondary' : 'primary'}
            >
                <Glyph size="sm" />
                {messages(live ? 'disconnect' : 'connect')}
            </Button>
        </div>
    );
}

function ConnectionNamespace({ namespace }: Pick<ConnectionToolbarProps, 'namespace'>) {
    if (namespace === undefined || namespace === '/') {
        return null;
    }

    return (
        <span
            className="shrink-0 px-pad-control font-ui text-sm text-text-secondary"
            data-part="connection-namespace"
        >
            {namespace}
        </span>
    );
}

/** The face of the pill for each state of the socket worth one; the others draw none. */
const PILL_BY_DOT_STATE: Partial<
    Record<DotState, { label: 'stateConnected' | 'stateConnecting'; tone: 'success' | 'warning' }>
> = {
    connected: { label: 'stateConnected', tone: 'success' },
    connecting: { label: 'stateConnecting', tone: 'warning' },
};

/**
 * The state of the socket inside the end of the address, and how long it has been connected. A
 * closed connection shows nothing there: the toggle beside already says it can connect.
 */
function ConnectionStatePill({
    openedAt,
    wsState,
}: Pick<ConnectionToolbarProps, 'openedAt' | 'wsState'>) {
    const messages = useMessages('connections');
    const elapsed = useElapsedSince(openedAt);
    const pill = PILL_BY_DOT_STATE[dotStateFor(wsState)];

    if (pill === undefined) {
        return null;
    }

    const said =
        openedAt === undefined
            ? messages(pill.label)
            : messages('stateSince', {
                  elapsed: formatElapsed(elapsed),
                  state: messages(pill.label),
              });

    return (
        <Badge className="h-5 gap-gap-icon-text px-1.5 font-semibold tabular-nums" tone={pill.tone}>
            <span aria-hidden className="size-1.5 rounded-full bg-current" />
            <span data-part="connection-state">{said}</span>
        </Badge>
    );
}

import { AddressField, EnvironmentSelect } from '@mandor/env';
import { ConnectIcon, DisconnectIcon, RecordIcon } from '@mandor/icons';
import { useMessages } from '@mandor/i18n';
import type { RecordStatus } from '@mandor/ipc';
import type { Environment, Variable } from '@mandor/schema';
import { AddressBar, Button } from '@mandor/ui';

type ConnectionToolbarProps = {
    /** The environment the URL resolves its variables against. */
    environment: Environment | undefined;
    /** The environment the connection chose, which may be one the workspace no longer holds. */
    environmentId: string | null;
    /** The environments the workspace holds: the ones the connection may choose among. */
    environments: readonly Environment[];
    live: boolean;
    onEnvironmentChange: (environmentId: string) => void;
    onRecordToggle: () => void;
    onToggle: () => void;
    onUrlChange: (url: string) => void;
    onVariablesChange: (variables: readonly Variable[]) => void;
    pending: boolean;
    recording: RecordStatus;
    url: string;
    /** The namespace a Socket.IO connection joins; the root one is not worth a chip. */
    namespace?: string | undefined;
};

/**
 * Address bar of the connection: the environment it resolves against, the namespace it joins and
 * the URL it dials, fused the way an address bar is, then the toggle. The transport is not here:
 * a connection is made for one, so it is set in its settings and its logo marks the tab.
 */
export function ConnectionToolbar({
    environment,
    environmentId,
    environments,
    live,
    onEnvironmentChange,
    onRecordToggle,
    onToggle,
    onUrlChange,
    onVariablesChange,
    pending,
    recording,
    url,
    namespace,
}: ConnectionToolbarProps) {
    const messages = useMessages('connections');

    const Glyph = live ? DisconnectIcon : ConnectIcon;

    return (
        <div
            className="flex h-header shrink-0 items-center gap-gap-control px-pad-panel"
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
            </AddressBar>
            <Button onClick={onRecordToggle} variant={recording.active ? 'secondary' : 'ghost'}>
                <RecordIcon size="sm" />
                {recording.active ? messages('recording') : messages('record')}
                <RecordingCount recording={recording} />
            </Button>
            <Button loading={pending} onClick={onToggle} variant={live ? 'secondary' : 'primary'}>
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

function RecordingCount({ recording }: Pick<ConnectionToolbarProps, 'recording'>) {
    if (!recording.active) {
        return null;
    }

    return (
        <span className="tabular-nums" data-part="connection-recording-count">
            {recording.entries}
        </span>
    );
}

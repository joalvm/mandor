import { AddIcon } from '@mandor/icons';
import { useMessages } from '@mandor/i18n';
import type { Environment } from '@mandor/schema';
import { Button, DialogNavItem, DialogNavList, IconButton } from '@mandor/ui';

import { GLOBALS_ROW } from '../../lib/globals-row.js';

type EnvironmentListProps = {
    /** The environment that rules the workspace when nobody chose one. */
    defaultId: string | null;
    environments: readonly Environment[];
    onCreate: () => void;
    onMakeDefault: (environmentId: string) => void;
    onRemove: (environmentId: string) => void;
    onSelect: (environmentId: string) => void;
    selectedId: string | null;
};

/**
 * Names every environment of the workspace and marks the one being looked at. The door out
 * of each one lives in its own row — appearing as the pointer or the focus arrives — because
 * erasing is a row's business, never a button beside what is being edited.
 */
export function EnvironmentList({
    defaultId,
    environments,
    onCreate,
    onMakeDefault,
    onRemove,
    onSelect,
    selectedId,
}: EnvironmentListProps) {
    const messages = useMessages('environment');

    return (
        <div className="flex min-h-0 flex-1 flex-col gap-gap-control" data-part="environment-list">
            {/* The globals stand apart, above: always active, never removed nor renamed. */}
            <div className="flex-none">
                <DialogNavList label={messages('globals')}>
                    <DialogNavItem
                        icon="globe"
                        label={messages('globals')}
                        onSelect={() => {
                            onSelect(GLOBALS_ROW);
                        }}
                        selected={selectedId === GLOBALS_ROW}
                    />
                </DialogNavList>
            </div>
            <DialogNavList label={messages('list')}>
                {environments.map((environment) => (
                    <DialogNavItem
                        icon="environment"
                        key={environment.id}
                        label={
                            environment.id === defaultId
                                ? messages('defaultNamed', { name: environment.name })
                                : environment.name
                        }
                        onSelect={() => {
                            onSelect(environment.id);
                        }}
                        selected={environment.id === selectedId}
                    >
                        <IconButton
                            className="opacity-0 transition-opacity duration-fast group-focus-within:opacity-100 group-hover:opacity-100"
                            icon={environment.id === defaultId ? 'pinned' : 'pin'}
                            label={messages('useAsDefault')}
                            onClick={(event) => {
                                event.stopPropagation();
                                onMakeDefault(environment.id);
                            }}
                            size="sm"
                        />
                        <IconButton
                            className="opacity-0 transition-opacity duration-fast group-focus-within:opacity-100 group-hover:opacity-100"
                            icon="close"
                            label={messages('delete')}
                            onClick={(event) => {
                                event.stopPropagation();
                                onRemove(environment.id);
                            }}
                            size="sm"
                        />
                    </DialogNavItem>
                ))}
            </DialogNavList>
            <Button onClick={onCreate} size="sm" variant="secondary">
                <AddIcon size="sm" />
                {messages('create')}
            </Button>
        </div>
    );
}

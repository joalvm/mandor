import { AddIcon, SettingsIcon } from '@mandor/icons';
import { useMessages } from '@mandor/i18n';
import { fireAndForget, shellStore, useShellStore } from '@mandor/shell';
import { Menu, MenuButton, MenuContent, MenuItem, MenuSeparator } from '@mandor/ui';
import type { Environment } from '@mandor/schema';
import { useStore } from 'zustand';

import { envStore } from '../../env-store.js';
import { openManagedEnvironments } from '../../managed-environments.js';
import { pickerLabel } from '../../lib/picker-label.js';
import { EnvironmentChoices } from './EnvironmentChoices.js';

type EnvironmentPickerProps = {
    disabled?: boolean | undefined;
    disabledReason?: string | undefined;
    onChange: (environmentId: string | null) => void;
    options: readonly Environment[];
    value: string | null;
};

/**
 * Names the environment in force and offers the others. It does not know who owns that choice:
 * Mandor Realtime hands it the one of the connection on screen, Mandor Request the one of the
 * workspace. Reading the owner here would mean knowing which window it is standing in, and only
 * `apps/*` gets to know that.
 *
 * Creating one is a different matter: it lands in the workspace the window is on, whoever owns
 * the choice, so the id is read at the moment of the command and never subscribed to.
 *
 * When the owner of the choice is not on screen the picker is handed disabled with the reason
 * why, and stays where it was: the environment is chrome of the window and does not come and go.
 */
export function EnvironmentPicker({
    disabled,
    disabledReason,
    onChange,
    options,
    value,
}: EnvironmentPickerProps) {
    const messages = useMessages('environment');
    const chosen = options.find((environment) => environment.id === value);
    const workspaceId = useShellStore((state) => state.activeWorkspaceId);
    // With none chosen, the default of the workspace rules: the picker names it as such.
    const fallback = useStore(envStore, (state) =>
        workspaceId === null ? undefined : state.defaultEnvironmentIds[workspaceId],
    );
    const ruling = options.find((environment) => environment.id === fallback);

    function create(): void {
        const workspaceId = shellStore.getState().activeWorkspaceId;

        if (workspaceId === null) {
            return;
        }

        fireAndForget(envStore.getState().create(workspaceId, messages('defaultName')));
    }

    function manage(): void {
        const workspaceId = shellStore.getState().activeWorkspaceId;

        if (workspaceId !== null) {
            openManagedEnvironments(workspaceId, chosen?.id ?? null);
        }
    }

    return (
        <Menu checkable>
            <MenuButton
                disabled={disabled}
                disabledReason={disabledReason}
                icon="environment"
                label={pickerLabel(
                    chosen,
                    ruling,
                    (name) => messages('defaultNamed', { name }),
                    messages('none'),
                )}
                variant="chrome"
            />
            <MenuContent>
                <EnvironmentChoices onChange={onChange} options={options} value={value} />
                <EnvironmentCreate empty={options.length === 0} onCreate={create} />
                <MenuSeparator />
                <MenuItem onSelect={manage}>
                    <SettingsIcon />
                    {messages('manage')}
                </MenuItem>
            </MenuContent>
        </Menu>
    );
}

function EnvironmentCreate({ empty, onCreate }: { empty: boolean; onCreate: () => void }) {
    const messages = useMessages('environment');

    if (!empty) {
        return null;
    }

    return (
        <MenuItem onSelect={onCreate}>
            <AddIcon />
            {messages('create')}
        </MenuItem>
    );
}

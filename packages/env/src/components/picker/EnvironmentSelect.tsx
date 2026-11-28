import { ChevronDownIcon, EnvironmentIcon } from '@mandor/icons';
import { useMessages } from '@mandor/i18n';
import type { Environment } from '@mandor/schema';
import { Button, Menu, MenuContent, MenuTrigger } from '@mandor/ui';

import { EnvironmentChoices } from './EnvironmentChoices.js';

type EnvironmentSelectProps = {
    disabled?: boolean | undefined;
    disabledReason?: string | undefined;
    onChange: (environmentId: string) => void;
    options: readonly Environment[];
    value: string | null;
};

/**
 * The environment something resolves against, as the first part of its address bar: only the
 * choice among the environments of the workspace. Creating and managing them is chrome of the
 * window, said once beside the origin, not in every bar that picks one.
 *
 * It draws no edge: it lives inside an `AddressBar`, which owns the edge and the focus. With
 * nothing to choose it still stands where it stood, disabled, and says on hover where they come
 * from.
 */
export function EnvironmentSelect({
    disabled = false,
    disabledReason,
    onChange,
    options,
    value,
}: EnvironmentSelectProps) {
    const messages = useMessages('environment');
    const chosen = options.find((environment) => environment.id === value);
    const empty = options.length === 0;
    const reason = disabled ? disabledReason : messages('noneToChoose');

    return (
        <Menu checkable>
            <MenuTrigger>
                <Button
                    className="h-field max-w-48 shrink-0 rounded-e-none border-0 px-pad-control"
                    data-part="environment-select"
                    disabled={disabled || empty}
                    disabledReason={reason}
                    variant="ghost"
                >
                    <EnvironmentIcon size="sm" />
                    <span className="min-w-0 truncate">{chosen?.name ?? messages('none')}</span>
                    <ChevronDownIcon size="sm" />
                </Button>
            </MenuTrigger>
            <MenuContent>
                <EnvironmentChoices onChange={onChange} options={options} value={value} />
            </MenuContent>
        </Menu>
    );
}

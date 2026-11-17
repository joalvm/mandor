import { useMessages } from '@mandor/i18n';
import { shellStore } from '@mandor/shell';
import type { Environment, Variable } from '@mandor/schema';
import type { VariableScope } from '@mandor/vars';
import { Popover, PopoverPanel } from '@mandor/ui';
import type { ReactNode } from 'react';

import type { HoverGrace } from '../../hooks/useHoverGrace.js';
import { openManagedEnvironments } from '../../managed-environments.js';
import { VariablePopoverBody } from './VariablePopoverBody.js';

type VariablePopoverProps = {
    environment: Environment | undefined;
    hover: HoverGrace;
    onVariablesChange: (variables: readonly Variable[]) => void;
    /** What the field resolves against: the popover says which level gives the value. */
    scope: VariableScope;
};

/**
 * The popover of one variable: it hangs from the token the pointer is on, reads and edits
 * the variable in place, and offers the declaration it is missing right there. It never
 * takes the focus on opening — the surface under it is still being typed into — and it stays
 * while the pointer crosses to it. Once the focus is in it (the user asked for it by creating
 * the variable, or by clicking the value) it stays for as long as the focus does, wherever the
 * pointer goes. The way into every variable of the workspace is its own.
 */
export function VariablePopover({
    environment,
    hover,
    onVariablesChange,
    scope,
}: VariablePopoverProps): ReactNode {
    const messages = useMessages('environment');
    const { token } = hover;

    if (token === null) {
        return null;
    }

    return (
        <Popover
            anchor={hover.anchor}
            key={token.name}
            modal={false}
            onOpenChange={(open) => {
                if (!open) {
                    hover.close();
                }
            }}
            open
        >
            <PopoverPanel
                autofocus={false}
                label={messages('popover', { name: `{{${token.name}}}` })}
            >
                <div
                    onBlur={(event) => {
                        // Moving between the controls of the panel is still being inside it.
                        if (event.currentTarget.contains(event.relatedTarget)) {
                            return;
                        }

                        hover.hold(false);

                        // A pointer still over the panel has not left it: its leave will say so.
                        if (!event.currentTarget.matches(':hover')) {
                            hover.schedule();
                        }
                    }}
                    onFocus={() => {
                        hover.hold(true);
                    }}
                    onPointerEnter={hover.cancel}
                    onPointerLeave={hover.schedule}
                >
                    <VariablePopoverBody
                        environment={environment}
                        name={token.name}
                        onSeeAll={() => {
                            const workspaceId = shellStore.getState().activeWorkspaceId;

                            if (workspaceId !== null) {
                                openManagedEnvironments(workspaceId, environment?.id ?? null);
                            }

                            hover.close();
                        }}
                        onVariablesChange={onVariablesChange}
                        scope={scope}
                    />
                </div>
            </PopoverPanel>
        </Popover>
    );
}

/** Opens every variable of the workspace on screen, standing on the environment in force. */

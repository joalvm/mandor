import { useMessages } from '@mandor/i18n';
import { WorkspaceMenu } from '@mandor/workspace';
import { OriginMenu } from '@mandor/repos';
import { AppIcon, AppMenuButton, CommandCenter, WindowControls } from '@mandor/shell';
import { IconButton, TitleBar } from '@mandor/ui';

import { WorkspaceEnvironmentPicker } from '../environment/WorkspaceEnvironmentPicker.js';
import appIcon from './app-icon.png?inline';

type SyncTitleBarProps = {
    onManageOrigins: () => void;
    onManageWorkspaces: () => void;
    onOpenSettings: () => void;
    onSwitchOrigin: (id: string) => void;
};

// The two windows share a shape today and are free to stop sharing it.
// jscpd:ignore-start
/**
 * The top row of Mandor Request: the icon, the app menu, the origin and the workspace; the room of
 * the command centre; and the environment of the workspace, the settings and the window buttons
 * at the end. Origin, workspace and environment read in the order each one holds the next.
 *
 * The two ends are halves of the same weight, so the command centre stands on the middle of the
 * window and not on the middle of what is left: the end keeps on its inner side the air the row
 * opens with on the left. A half wider than its share pushes the centre aside before anything
 * breaks in two. The row of the two windows looks alike because each one writes it that way, not
 * because a frame decides it for both.
 */
export function SyncTitleBar({
    onManageOrigins,
    onManageWorkspaces,
    onOpenSettings,
    onSwitchOrigin,
}: SyncTitleBarProps) {
    const messages = useMessages('sync');

    return (
        <TitleBar>
            <div
                className="flex flex-1 basis-0 items-center gap-gap-control"
                data-part="title-start"
            >
                <AppIcon src={appIcon} />
                <AppMenuButton />
                <OriginMenu onManage={onManageOrigins} onSwitch={onSwitchOrigin} />
                <WorkspaceMenu onManage={onManageWorkspaces} />
            </div>
            <div
                className="flex h-full min-w-0 items-center justify-center"
                data-part="title-search"
            >
                <CommandCenter />
            </div>
            <div
                className="flex flex-1 basis-0 items-center justify-end gap-gap-control pl-pad-panel"
                data-part="title-end"
            >
                <span className="flex shrink-0 items-center" data-part="title-environment">
                    <WorkspaceEnvironmentPicker />
                </span>
                <IconButton icon="settings" label={messages('settings')} onClick={onOpenSettings} />
                <WindowControls />
            </div>
        </TitleBar>
    );
}
// jscpd:ignore-end

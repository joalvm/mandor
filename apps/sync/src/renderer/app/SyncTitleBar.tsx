import { useMessages } from '@mandor/i18n';
import { WorkspaceMenu } from '@mandor/workspace';
import { OriginMenu } from '@mandor/repos';
import { AppIcon, AppMenuButton, WindowControls } from '@mandor/shell';
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
 * the search; and the environment of the workspace, the settings and the window buttons at the
 * end. Origin, workspace and environment read in the order each one holds the next.
 *
 * The room of the search is empty today and still takes the free width, so both ends stay put
 * the day it is filled. The row of the two windows looks alike because each one writes it that
 * way, not because a frame decides it for both.
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
            <AppIcon src={appIcon} />
            <AppMenuButton />
            <OriginMenu onManage={onManageOrigins} onSwitch={onSwitchOrigin} />
            <WorkspaceMenu onManage={onManageWorkspaces} />
            <div
                className="flex h-full min-w-0 flex-1 items-center justify-center px-pad-control"
                data-part="title-search"
            />
            <span className="flex shrink-0 items-center" data-part="title-environment">
                <WorkspaceEnvironmentPicker />
            </span>
            <IconButton icon="settings" label={messages('settings')} onClick={onOpenSettings} />
            <WindowControls />
        </TitleBar>
    );
}
// jscpd:ignore-end

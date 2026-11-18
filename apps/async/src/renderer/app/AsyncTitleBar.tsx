import { ManageEnvironmentsButton } from '@mandor/env';
import { WorkspaceMenu } from '@mandor/workspace';
import { useMessages } from '@mandor/i18n';
import { OriginMenu } from '@mandor/repos';
import { AppIcon, AppMenuButton, WindowControls } from '@mandor/shell';
import { IconButton, TitleBar } from '@mandor/ui';

import appIcon from './app-icon.png?inline';

type AsyncTitleBarProps = {
    onManageOrigins: () => void;
    onManageWorkspaces: () => void;
    onOpenSettings: () => void;
    onSwitchOrigin: (id: string) => void;
};

// The two windows share a shape today and are free to stop sharing it.
// jscpd:ignore-start
/**
 * The top row of Mandor Realtime, written out in the order it is read.
 *
 * The icon and the app menu open the row, then the origin and the workspace: the origin holds
 * the workspaces, so the row reads from the outside in. The environments, the
 * settings and the window buttons close it. The environments are only managed here: each
 * connection chooses its own in its address bar. Between them stands the room of the search: empty today and still the part
 * that takes the free width, so the two ends stay where they are the day it is filled and a child
 * dropped there sits centred. The icon is inlined, because the policy of the window lets images
 * come from the page and from nowhere else. Where each piece goes is decided here and nowhere
 * else — the zone only draws the band.
 */
export function AsyncTitleBar({
    onManageOrigins,
    onManageWorkspaces,
    onOpenSettings,
    onSwitchOrigin,
}: AsyncTitleBarProps) {
    const messages = useMessages('async');

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
            <ManageEnvironmentsButton />
            <IconButton icon="settings" label={messages('settings')} onClick={onOpenSettings} />
            <WindowControls />
        </TitleBar>
    );
}
// jscpd:ignore-end

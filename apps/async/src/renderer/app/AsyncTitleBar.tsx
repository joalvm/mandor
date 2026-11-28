import { ManageEnvironmentsButton } from '@mandor/env';
import { WorkspaceMenu } from '@mandor/workspace';
import { useMessages } from '@mandor/i18n';
import { OriginMenu } from '@mandor/repos';
import { AppIcon, AppMenuButton, CommandCenter, WindowControls } from '@mandor/shell';
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
 * connection chooses its own in its address bar. Between them stands the command centre, on the
 * middle of the window and not on the middle of what is left: the two ends are halves of the same
 * weight, the end keeping on its inner side the air the row opens with on the left, and a half
 * wider than its share pushes the centre aside before anything breaks in two. The icon is
 * inlined, because the policy of the window lets images come from the page and from nowhere else.
 * Where each piece goes is decided here and nowhere else — the zone only draws the band.
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
                className="flex h-full flex-1 basis-0 items-center justify-end gap-gap-control ps-pad-panel"
                data-part="title-end"
            >
                <ManageEnvironmentsButton />
                <IconButton icon="settings" label={messages('settings')} onClick={onOpenSettings} />
                <WindowControls />
            </div>
        </TitleBar>
    );
}
// jscpd:ignore-end

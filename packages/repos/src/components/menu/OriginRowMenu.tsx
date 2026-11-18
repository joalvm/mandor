import { CloseIcon, ConnectIcon, DeleteIcon, RenameIcon } from '@mandor/icons';
import { useMessages } from '@mandor/i18n';
import type { Origin } from '@mandor/schema';
import { IconButton, Menu, MenuContent, MenuItem, MenuTrigger } from '@mandor/ui';

type OriginRowMenuProps = {
    origin: Origin;
    onRename: () => void;
    onCheck: () => void;
    onEmpty: () => void;
    onRemove: () => void;
};

/**
 * What one origin of the table offers. The list is the spec's table of actions: everything to a
 * remote origin, and to `Local` only what its floor allows — no rename, no check, no removal.
 * Working in an origin is not here; the selector of the window is the only way in.
 */
export function OriginRowMenu({
    origin,
    onRename,
    onCheck,
    onEmpty,
    onRemove,
}: OriginRowMenuProps) {
    const messages = useMessages('origins');
    const remote = origin.kind !== 'local';

    return (
        <Menu>
            <MenuTrigger>
                <IconButton icon="more-horizontal" label={messages('rowOptions')} size="sm" />
            </MenuTrigger>
            <MenuContent>
                <RenameItem onSelect={onRename} remote={remote} />
                <CheckItem onSelect={onCheck} remote={remote} />
                <MenuItem onSelect={onEmpty}>
                    <DeleteIcon />
                    {messages('empty')}
                </MenuItem>
                <RemoveItem onSelect={onRemove} remote={remote} />
            </MenuContent>
        </Menu>
    );
}

type RemoteItemProps = { onSelect: () => void; remote: boolean };

function RenameItem({ onSelect, remote }: RemoteItemProps) {
    const messages = useMessages('origins');

    if (!remote) {
        return null;
    }

    return (
        <MenuItem onSelect={onSelect}>
            <RenameIcon />
            {messages('rename')}
        </MenuItem>
    );
}

function CheckItem({ onSelect, remote }: RemoteItemProps) {
    const messages = useMessages('origins');

    if (!remote) {
        return null;
    }

    return (
        <MenuItem onSelect={onSelect}>
            <ConnectIcon />
            {messages('check')}
        </MenuItem>
    );
}

function RemoveItem({ onSelect, remote }: RemoteItemProps) {
    const messages = useMessages('origins');

    if (!remote) {
        return null;
    }

    return (
        <MenuItem onSelect={onSelect}>
            <CloseIcon />
            {messages('remove')}
        </MenuItem>
    );
}

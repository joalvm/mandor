import { useMessages } from '@mandor/i18n';
import { Button } from '@mandor/ui';
import type { ReactNode } from 'react';

type ExportButtonDoorProps = {
    onOpen: (collection?: string) => void;
};

/** The door of the whole workspace: a button that opens the export on the workspace as it is. */
export function ExportButtonDoor({ onOpen }: ExportButtonDoorProps): ReactNode {
    const messages = useMessages('export');

    return (
        <Button
            onClick={() => {
                onOpen();
            }}
            variant="ghost"
        >
            {messages('workspace')}
        </Button>
    );
}

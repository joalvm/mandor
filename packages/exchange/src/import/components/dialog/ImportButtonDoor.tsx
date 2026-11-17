import { useMessages } from '@mandor/i18n';
import { Button } from '@mandor/ui';
import type { ReactNode } from 'react';

type ImportButtonDoorProps = {
    onOpen: () => void;
};

/** The door of the whole workspace: a button with words, beside the other actions of its page. */
export function ImportButtonDoor({ onOpen }: ImportButtonDoorProps): ReactNode {
    const messages = useMessages('import');

    return (
        <Button onClick={onOpen} variant="ghost">
            {messages('workspace')}
        </Button>
    );
}

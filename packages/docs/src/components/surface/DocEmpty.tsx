import { useMessages } from '@mandor/i18n';
import { Button, EmptyState } from '@mandor/ui';

type DocEmptyProps = { onWrite: () => void };

/** A doc with nothing in it has nothing to read, and says so with the way to start writing it. */
export function DocEmpty({ onWrite }: DocEmptyProps) {
    const messages = useMessages('docs');

    return (
        <EmptyState
            description={messages('blankBody')}
            icon="markdown"
            title={messages('blankTitle')}
        >
            <Button onClick={onWrite} size="sm">
                {messages('blankWrite')}
            </Button>
        </EmptyState>
    );
}

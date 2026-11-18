import { useMessages } from '@mandor/i18n';
import { shellStore, windowSurface } from '@mandor/shell';
import { Button } from '@mandor/ui';

/**
 * Takes the reader to the history of the workspace. It asks the window for the surface by name:
 * who draws the history is another feature's business, and this one never learns its name.
 */
export function OpenHistoryButton() {
    const labels = useMessages('requests');

    return (
        <Button
            onClick={() => {
                windowSurface('history')?.open(shellStore.getState());
            }}
            size="sm"
            variant="ghost"
        >
            {labels('openHistory')}
        </Button>
    );
}

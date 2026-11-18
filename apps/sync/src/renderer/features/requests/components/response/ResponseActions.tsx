import { useMessages } from '@mandor/i18n';
import type { HttpResponse } from '@mandor/schema';
import { shellStore, windowSurface } from '@mandor/shell';
import { IconButton, Menu, MenuContent, MenuItem, MenuSeparator, MenuTrigger } from '@mandor/ui';

import { useSaveBody } from '../../../../response/hooks/useSaveBody.js';
import { responseKindOf } from '../../../../response/lib/body-views.js';

type ResponseActionsProps = {
    /** Lets go of the response: the panel goes back to waiting for a send. */
    onClear: () => void;
    response: HttpResponse;
};

/**
 * What can be done with the answer of the last send, behind the dots at the end of its strip:
 * save its body to a file, let it go, or open the history where every send is kept. Keeping it as
 * an example lives at the end of the address, with the rest of what is done with the request.
 */
export function ResponseActions({ onClear, response }: ResponseActionsProps) {
    const labels = useMessages('requests');
    const save = useSaveBody(response, responseKindOf(response));

    return (
        <div className="flex shrink-0 items-center gap-gap-tight" data-part="response-actions">
            <Menu>
                <MenuTrigger>
                    <IconButton icon="more-horizontal" label={labels('responseMore')} size="sm" />
                </MenuTrigger>
                <MenuContent>
                    <MenuItem onSelect={save}>{labels('saveResponseToFile')}</MenuItem>
                    <MenuItem onSelect={onClear}>{labels('clearResponse')}</MenuItem>
                    <MenuSeparator />
                    <MenuItem
                        onSelect={() => {
                            windowSurface('history')?.open(shellStore.getState());
                        }}
                    >
                        {labels('openHistory')}
                    </MenuItem>
                </MenuContent>
            </Menu>
        </div>
    );
}

import { useMessages } from '@mandor/i18n';
import { EyeClosedIcon, EyeIcon } from '@mandor/icons';
import { Button } from '@mandor/ui';
import type { ReactNode } from 'react';

import { useKeyValueTable } from './key-value-context.js';

/**
 * The one way the rows the app adds come in and out of sight. Hidden is where they start:
 * the count is what the table says of them until someone asks to see them.
 */
export function KeyValueAutoToggle(): ReactNode {
    const messages = useMessages('environment');
    const table = useKeyValueTable();

    if (table.autoLines === undefined || table.autoLines.length === 0) {
        return null;
    }

    return (
        <Button
            onClick={table.onToggleAuto}
            size="sm"
            title={table.autoShown ? messages('keyValueAutoHide') : messages('keyValueAutoShow')}
            variant="ghost"
        >
            <AutoToggleIcon shown={table.autoShown} />
            {table.autoShown
                ? null
                : messages('keyValueAutoHidden', { count: table.autoLines.length })}
        </Button>
    );
}

function AutoToggleIcon({ shown }: { shown: boolean }) {
    if (shown) {
        return <EyeClosedIcon size="sm" />;
    }

    return <EyeIcon size="sm" />;
}

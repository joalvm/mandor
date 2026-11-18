import type { Element } from 'hast';
import { useMessages } from '@mandor/i18n';
import { Checkbox } from '@mandor/ui';

import { useDocTask } from '../../hooks/useDocTask.js';

type DocTaskProps = { checked?: boolean | undefined; node?: Element | undefined };

/**
 * The box of a task of the list (`- [ ]`). Pressing it writes the text: the doc stays the truth,
 * and the page draws the box again from what it now says. Where nothing around the page writes
 * the doc, the box shows what the text says and takes no press.
 */
export function DocTask({ checked, node }: DocTaskProps) {
    const messages = useMessages('docs');
    const onTask = useDocTask();
    const index = Number(node?.properties['dataTask'] ?? -1);

    return (
        <Checkbox
            checked={checked === true}
            disabled={onTask === null}
            label={messages('taskDone')}
            onCheckedChange={() => {
                onTask?.(index);
            }}
        />
    );
}

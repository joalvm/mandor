import type { Element } from 'hast';
import { Icon, type IconName } from '@mandor/icons';
import { useMessages } from '@mandor/i18n';
import type { PropsWithChildren } from 'react';

import { docAlertOf, type DocAlertKind } from '../../lib/doc-alert.js';

type DocQuoteProps = PropsWithChildren<{
    /** The line of the doc the quote starts at, for whoever keeps the page level with the text. */
    'data-line'?: number | undefined;
    node?: Element | undefined;
}>;

type AlertLook = { icon: IconName; title: `alert${Capitalize<DocAlertKind>}` };

/** What each alert of GitHub is called and wears. The body is prose and reads the same in all. */
const ALERTS: Readonly<Record<DocAlertKind, AlertLook>> = {
    caution: { icon: 'error', title: 'alertCaution' },
    important: { icon: 'info', title: 'alertImportant' },
    note: { icon: 'info', title: 'alertNote' },
    tip: { icon: 'info', title: 'alertTip' },
    warning: { icon: 'warning', title: 'alertWarning' },
};

/**
 * A quote of a doc, or one of the five alerts of GitHub when its first line said so
 * (`> [!NOTE]`…). The kind colours the title and the rule at its edge; the body keeps the colour
 * of the text, so an alert reads as prose with a word in front of it and not as a warning light.
 */
export function DocQuote({ children, 'data-line': line, node }: DocQuoteProps) {
    const messages = useMessages('docs');
    const kind = docAlertOf(node);

    if (kind === undefined) {
        return (
            <blockquote data-line={line} data-part="doc-quote">
                {children}
            </blockquote>
        );
    }

    const look = ALERTS[kind];

    return (
        <div data-alert={kind} data-line={line} data-part="doc-alert" role="note">
            <p className="flex items-center gap-gap-icon-text" data-part="doc-alert-title">
                <Icon name={look.icon} />
                {messages(look.title)}
            </p>
            {children}
        </div>
    );
}

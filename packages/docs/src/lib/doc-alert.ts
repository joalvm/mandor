import type { Element } from 'hast';

/** The five alerts of GitHub, as the marks of the page write them on a quote. */
const DOC_ALERT_KINDS = ['caution', 'important', 'note', 'tip', 'warning'] as const;

export type DocAlertKind = (typeof DOC_ALERT_KINDS)[number];

/** The alert a quote was marked as, or nothing for a plain quote. */
export function docAlertOf(node: Element | undefined): DocAlertKind | undefined {
    const kind = node?.properties['dataAlert'];

    return DOC_ALERT_KINDS.find((each) => each === kind);
}

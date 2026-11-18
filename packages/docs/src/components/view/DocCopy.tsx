import type { IconName } from '@mandor/icons';
import { useMessages } from '@mandor/i18n';
import { fireAndForget } from '@mandor/shell';
import { IconButton } from '@mandor/ui';
import { useEffect, useState } from 'react';

type DocCopyProps = {
    /** A link copies under a link, anything else under the copy glyph. */
    copies?: 'link' | 'text' | undefined;
    label: string;
    text: string;
};

const GLYPHS: Record<NonNullable<DocCopyProps['copies']>, IconName> = {
    link: 'link',
    text: 'copy',
};

/** How long the tick stays after a copy: long enough to be seen, not so long it is in the way. */
const COPIED_MS = 1500;

/**
 * Copies a text of the page and says so on the button itself: the glyph turns into a tick for a
 * moment. A toast for a copy would be news of something the reader did a moment ago.
 */
export function DocCopy({ copies = 'text', label, text }: DocCopyProps) {
    const messages = useMessages('docs');
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (!copied) {
            return undefined;
        }

        const timer = setTimeout(() => {
            setCopied(false);
        }, COPIED_MS);

        return () => {
            clearTimeout(timer);
        };
    }, [copied]);

    return (
        <IconButton
            icon={copied ? 'check' : GLYPHS[copies]}
            label={copied ? messages('copied') : label}
            onClick={() => {
                fireAndForget(
                    navigator.clipboard.writeText(text).then(() => {
                        setCopied(true);
                    }),
                );
            }}
            size="xs"
        />
    );
}

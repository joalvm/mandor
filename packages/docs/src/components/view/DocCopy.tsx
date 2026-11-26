import type { IconName } from '@mandor/icons';
import { useMessages } from '@mandor/i18n';
import { useMarkedCopy } from '@mandor/shell';
import { IconButton } from '@mandor/ui';

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

/** Copies a text of the page and says so on the button itself: the glyph turns into a tick. */
export function DocCopy({ copies = 'text', label, text }: DocCopyProps) {
    const messages = useMessages('docs');
    const { copied, copy } = useMarkedCopy();

    return (
        <IconButton
            icon={copied ? 'check' : GLYPHS[copies]}
            label={copied ? messages('copied') : label}
            onClick={() => {
                copy(text);
            }}
            size="xs"
        />
    );
}

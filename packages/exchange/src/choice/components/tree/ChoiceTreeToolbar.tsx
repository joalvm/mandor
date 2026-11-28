import { useMessages } from '@mandor/i18n';
import { IconButton, SearchInput } from '@mandor/ui';
import { Children, type PropsWithChildren } from 'react';

type ChoiceTreeToolbarProps = PropsWithChildren<{
    /** Every branch is folded: the button then opens them all, and otherwise closes them. */
    allFolded: boolean;
    /** There is a branch to fold; without one the button has nothing to do. */
    foldable: boolean;
    needle: string;
    onFoldAll: () => void;
    onNeedleChange: (needle: string) => void;
}>;

/**
 * The one line above the tree: what the owner puts at the left —the format, in an export— and, at
 * the right, the filter and the button that folds or opens the whole tree. With nothing at the
 * left, the filter takes the line; with something there, it keeps a size of its own and the gap
 * between the two stays where it is.
 */
export function ChoiceTreeToolbar({
    allFolded,
    children,
    foldable,
    needle,
    onFoldAll,
    onNeedleChange,
}: ChoiceTreeToolbarProps) {
    const messages = useMessages('choice');
    const alone = Children.toArray(children).length === 0;

    return (
        <div
            className="flex items-center justify-between gap-gap-group"
            data-part="choice-tree-toolbar"
        >
            {children}
            <div
                className={
                    alone
                        ? 'flex min-w-0 flex-1 items-center gap-gap-control'
                        : 'ms-auto flex items-center gap-gap-control'
                }
            >
                <SearchInput
                    className={alone ? 'min-w-0 flex-1' : 'w-48'}
                    label={messages('filter')}
                    onValueChange={onNeedleChange}
                    placeholder={messages('filter')}
                    value={needle}
                />
                <IconButton
                    disabled={!foldable}
                    icon={allFolded ? 'unfold' : 'fold'}
                    label={messages(allFolded ? 'expand' : 'collapse')}
                    onClick={onFoldAll}
                    size="sm"
                />
            </div>
        </div>
    );
}

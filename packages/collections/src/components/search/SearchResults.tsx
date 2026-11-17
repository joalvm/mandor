import { useMessages } from '@mandor/i18n';
import { EmptyRow, ListRow, RowLabel, RowList } from '@mandor/ui';
import { useStore } from 'zustand';

import { openSearchHit } from '../../search/open-search-hit.js';
import { searchStore } from '../../search/search-store.js';

type SearchResultsProps = {
    onOpenEnvironment: (workspaceId: string, environmentId: string) => void;
};

/**
 * The body of the bar while the query carries. The hits are already on the store the field
 * published to: this draws them and opens them, and knows nothing about how they were matched.
 *
 * A hit is a row of the lateral like any other, so it is one line: the name, and after it what
 * matched and where. Stacking the two inside the height of a row was the previous shape, and a
 * row of the app is one line tall.
 */
export function SearchResults({ onOpenEnvironment }: SearchResultsProps) {
    return (
        <div className="flex min-h-0 flex-1 flex-col py-pad-panel" data-part="search-results">
            <SearchBody onOpenEnvironment={onOpenEnvironment} />
        </div>
    );
}

/** Where the hit hangs, after what matched; a hit that hangs from nothing says nothing more. */
function SearchHitTrail({ trail }: { trail: string }) {
    if (trail === '') {
        return null;
    }

    return <> · {trail}</>;
}

function SearchBody({ onOpenEnvironment }: SearchResultsProps) {
    const messages = useMessages('collections');
    const hits = useStore(searchStore, (state) => state.hits);

    if (hits.length === 0) {
        return (
            <EmptyRow
                description={messages('searchEmpty')}
                icon="search"
                title={messages('searchHeading')}
            />
        );
    }

    return (
        <RowList className="min-h-0 overflow-y-auto" label={messages('searchResults')}>
            {hits.map((hit, index) => (
                <ListRow
                    className="px-pad-panel"
                    key={`${hit.resource}-${String(index)}`}
                    onSelect={(activation) => {
                        openSearchHit(hit, activation.altKey, onOpenEnvironment);
                    }}
                    selected={false}
                >
                    <RowLabel>{hit.name}</RowLabel>
                    <span className="min-w-0 truncate text-xs text-text-secondary">
                        {messages(`searchMatch.${hit.matched}`)}
                        <SearchHitTrail trail={hit.trail} />
                    </span>
                </ListRow>
            ))}
        </RowList>
    );
}

import { useMessages } from '@mandor/i18n';
import { Button, EmptyState } from '@mandor/ui';
import type { PropsWithChildren } from 'react';
import { ErrorBoundary, type FallbackProps } from 'react-error-boundary';

type FaultScope = 'section' | 'tab' | 'window';

type FaultBoundaryProps = PropsWithChildren<{
    /** How a tab leaves: the way out of a tab that will not draw, which a section or a window has no use for. */
    onClose?: (() => void) | undefined;
    /** What the boundary draws from: when one changes, a failure is forgotten and the children try again. */
    resetKeys?: unknown[] | undefined;
    scope: FaultScope;
}>;

type FaultStateProps = Pick<FaultBoundaryProps, 'onClose' | 'scope'> & { retry: () => void };

const TITLES = {
    section: 'faultSectionTitle',
    tab: 'faultTabTitle',
    window: 'faultWindowTitle',
} as const;

type Again = { label: 'faultReload' | 'faultRetry'; run: (retry: () => void) => void };

/** Trying again: a window that failed reloads whole, anything smaller draws itself once more. */
const AGAIN: Readonly<Record<FaultScope, Again>> = {
    section: {
        label: 'faultRetry',
        run: (retry) => {
            retry();
        },
    },
    tab: {
        label: 'faultRetry',
        run: (retry) => {
            retry();
        },
    },
    window: {
        label: 'faultReload',
        run: () => {
            location.reload();
        },
    },
};

/**
 * What stands where a region that threw would have been. It says what failed and where the detail
 * is, never the detail: a stack is for the log, and a person facing one has nothing to do with it.
 */
function FaultState({ onClose, retry, scope }: FaultStateProps) {
    const messages = useMessages('shell');
    const again = AGAIN[scope];

    return (
        <div
            className="flex min-h-0 min-w-0 flex-1 items-stretch"
            data-part="fault-boundary"
            data-scope={scope}
        >
            <EmptyState
                description={messages('faultDetail')}
                icon="error"
                title={messages(TITLES[scope])}
            >
                <div className="flex items-center gap-gap-control" data-part="fault-actions">
                    <Button
                        onClick={() => {
                            again.run(retry);
                        }}
                        variant="primary"
                    >
                        {messages(again.label)}
                    </Button>
                    <FaultCloseTab onClose={onClose} scope={scope} />
                </div>
            </EmptyState>
        </div>
    );
}

function FaultCloseTab({ onClose, scope }: Pick<FaultStateProps, 'onClose' | 'scope'>) {
    const messages = useMessages('shell');

    if (scope !== 'tab' || onClose === undefined) {
        return null;
    }

    return <Button onClick={onClose}>{messages('closeTab')}</Button>;
}

/**
 * Keeps what a component throws while it draws inside the region it was drawing. Without one the
 * whole window goes blank for a single tab; with one, the tab says it failed and the rest of the
 * window goes on.
 *
 * The fault itself is not written here: React hands every error a boundary caught to the root,
 * and the root writes it once, with the components it crossed (see `rootErrorOptions`).
 */
export function FaultBoundary({ children, onClose, resetKeys = [], scope }: FaultBoundaryProps) {
    return (
        <ErrorBoundary
            fallbackRender={({ resetErrorBoundary }: FallbackProps) => (
                <FaultState onClose={onClose} retry={resetErrorBoundary} scope={scope} />
            )}
            resetKeys={resetKeys}
        >
            {children}
        </ErrorBoundary>
    );
}

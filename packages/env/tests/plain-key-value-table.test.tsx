import { MessagesProvider } from '@mandor/i18n';
import { TooltipProvider } from '@mandor/ui';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useKeyValueTable } from '../src/components/key-value/key-value-context.js';
import { PlainKeyValueTable } from '../src/components/key-value/PlainKeyValueTable.js';
import { COLUMNS, LINES } from './support/key-value.js';

/** A child that proves where it is drawn: it reads the table it stands in. */
function LineCount() {
    return <p>{`${String(useKeyValueTable().lines.length)} lines`}</p>;
}

describe('the plain table of pairs (PlainKeyValueTable)', () => {
    it('draws its rows and, inside its context, what it contains', () => {
        render(
            <MessagesProvider preferences={{ language: 'en' }}>
                <TooltipProvider>
                    <PlainKeyValueTable
                        columns={COLUMNS}
                        environment={undefined}
                        lines={LINES}
                        onColumnsChange={() => undefined}
                        onLinesChange={() => undefined}
                        onVariablesChange={() => undefined}
                        title="Params"
                        typed={false}
                    >
                        <LineCount />
                    </PlainKeyValueTable>
                </TooltipProvider>
            </MessagesProvider>,
        );

        expect(screen.getAllByRole('textbox', { name: 'Key' })[0]).toHaveTextContent('start');
        expect(screen.getByText('3 lines')).toBeVisible();
    });
});

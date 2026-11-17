import { EyeClosedIcon } from '@mandor/icons';
import { useMessages } from '@mandor/i18n';
import { Badge, IconButton, Input } from '@mandor/ui';
import { type ReactNode, useEffect, useRef, useState } from 'react';

import { maskOf } from '../../lib/secret-mask.js';
import { VariableInput } from '../field/VariableInput.js';
import { useKeyValueTable } from './key-value-context.js';
import type { KeyValueLine } from './key-value-line.js';

type KeyValueValueCellProps = {
    line: KeyValueLine;
};

/**
 * The value cell of a row, in the voice the table was given: the field that speaks
 * variables, the literal line of a table that says nothing about them, or — when the line
 * carries the mark and the table carries secrets — the masked value with its badge and its
 * own eye.
 */
export function KeyValueValueCell({ line }: KeyValueValueCellProps): ReactNode {
    const messages = useMessages('environment');
    const table = useKeyValueTable();

    if (line.secret === true && table.secretable) {
        return <SecretValue line={line} />;
    }

    if (table.variables) {
        return (
            <VariableInput
                className="min-w-0 flex-1"
                environment={table.environment}
                label={messages('keyValueColumnValue')}
                onKeyDown={table.walk}
                onChange={(value) => {
                    table.editLine(line.id, { value });
                }}
                onVariablesChange={table.onVariablesChange}
                value={line.value}
                variant="flat"
            />
        );
    }

    return (
        <Input
            className="min-w-0 flex-1"
            label={messages('keyValueColumnValue')}
            onKeyDown={table.walk}
            onValueChange={(value) => {
                table.editLine(line.id, { value });
            }}
            value={line.value}
            variant="flat"
        />
    );
}

/**
 * The value of a secret line: dots and a locked line while it stays hidden, its text once
 * its own eye lifted them. Revealing is an act apart — the eye lives in the cell, next to
 * the badge, and never waits for the hover of the row; the focus alone does not reveal. A
 * focus that leaves the cell hides it again, so the text never lingers on the screen.
 */
function SecretValue({ line }: { line: KeyValueLine }): ReactNode {
    const messages = useMessages('environment');
    const table = useKeyValueTable();
    const [revealed, setRevealed] = useState(false);
    const cell = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const node = cell.current;

        if (node === null) {
            return;
        }

        // The focus leaving for anywhere but the cell itself hides the value again: reading
        // it through its own eye keeps it, walking away does not.
        const lose = (event: FocusEvent): void => {
            if (node.contains(event.relatedTarget as Node | null)) {
                return;
            }

            setRevealed(false);
        };

        node.addEventListener('focusout', lose);

        return () => {
            node.removeEventListener('focusout', lose);
        };
    }, []);

    return (
        <div
            className="flex min-w-0 flex-1 items-center gap-gap-tight"
            data-part="key-value-secret"
            ref={cell}
        >
            <span className="flex min-w-0 flex-1 items-center">
                <Input
                    key={revealed ? 'revealed' : 'masked'}
                    className="min-w-0 flex-1"
                    disabled={!revealed}
                    label={messages('keyValueColumnValue')}
                    onKeyDown={table.walk}
                    onValueChange={(value) => {
                        table.editLine(line.id, { value });
                    }}
                    value={revealed ? line.value : maskOf(line.value)}
                    variant="flat"
                />
            </span>
            <Badge aria-label={messages('variableSecret')} tone="neutral">
                <EyeClosedIcon size="sm" />
                {messages('keyValueSecret')}
            </Badge>
            <IconButton
                active={revealed}
                icon={revealed ? 'eye-closed' : 'eye'}
                label={revealed ? messages('keyValueHide') : messages('keyValueReveal')}
                onClick={() => {
                    setRevealed((current) => !current);
                }}
                size="sm"
            />
        </div>
    );
}

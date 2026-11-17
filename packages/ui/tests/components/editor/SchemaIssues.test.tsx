import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { SchemaIssues } from '../../../src/components/editor/SchemaIssues.js';

const SCHEMA = [
    '{',
    '    "properties": {',
    '        "data": { "properties": { "name": { "type": "string" } } }',
    '    },',
    '    "required": ["id"]',
    '}',
].join('\n');

const ROWS = [
    {
        keyword: 'type',
        message: 'must be string; it is integer',
        params: { expected: 'string', received: 'integer' },
        path: '/data/name',
        schemaPath: '/properties/data/properties/name/type',
    },
    {
        keyword: 'required',
        message: "required property 'id' is missing",
        params: { property: 'id' },
        path: '',
        schemaPath: '/required',
    },
];

function dock(rows: typeof ROWS, onPick = vi.fn()): void {
    render(
        <SchemaIssues
            issues={{
                expected: 'expected',
                line: (line) => `Ln ${String(line)}`,
                received: 'received',
                resize: 'Resize the schema and its problems',
                rows,
                title: 'Received 200 · 2 problems',
            }}
            judged='{ "data": { "name": 1735689600 } }'
            onPick={onPick}
            schema={SCHEMA}
        >
            <p>Schema</p>
        </SchemaIssues>,
    );
}

describe('the rules a value breaks, docked under what they are written around', () => {
    it('docks them in a panel of their own, under a band that says how many there are', () => {
        dock(ROWS);

        const panel = screen.getByRole('region', { name: 'Received 200 · 2 problems' });

        expect(panel).toHaveTextContent('Received 200 · 2 problems');
        expect(screen.getByText('Schema')).toBeVisible();
        expect(
            screen.getByRole('separator', { name: 'Resize the schema and its problems' }),
        ).toBeInTheDocument();
    });

    it('reads a rule as what it asked against what came, with the value as it came', () => {
        dock(ROWS);

        const row = screen.getByRole('option', { name: 'must be string; it is integer' });
        const part = (name: string) => row.querySelector(`[data-part="${name}"]`);

        expect(part('schema-issue-path')).toHaveTextContent('$.data.name');
        expect(row).toHaveTextContent('type');
        expect(row).toHaveTextContent('Ln 3');
        expect(part('schema-issue-verdict')).toHaveTextContent(
            'must be string; it is integerexpectedstringreceivedinteger1735689600',
        );
    });

    it('says in words a rule with no two halves to set side by side', () => {
        dock(ROWS);

        const row = screen.getByRole('option', { name: "required property 'id' is missing" });

        expect(row.querySelector('[data-part="schema-issue-verdict"]')).toBeNull();
        expect(row).toHaveTextContent("$requiredLn 5required property 'id' is missing");
    });

    it('hands back the rule behind the row taken, and keeps that row marked', () => {
        const onPick = vi.fn();

        dock(ROWS, onPick);

        const row = screen.getByRole('option', { name: "required property 'id' is missing" });

        fireEvent.click(row);

        expect(onPick).toHaveBeenCalledWith(ROWS[1]);
        expect(row).toHaveAttribute('aria-selected', 'true');
    });

    it('docks nothing for a value that keeps every rule, and keeps what it is written around', () => {
        dock([]);

        expect(screen.queryByRole('region')).toBeNull();
        expect(screen.queryByRole('separator')).toBeNull();
        expect(screen.getByText('Schema')).toBeVisible();
    });
});

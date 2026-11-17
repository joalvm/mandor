import { useMessages } from '@mandor/i18n';
import type { CookieRow } from '@mandor/ipc';
import { Table, TableHead, TableHeaderCell, TableTools, type TableColumn } from '@mandor/ui';

import { CookieJarRow } from '../row/CookieJarRow.js';

type CookieJarTableProps = {
    cookies: readonly CookieRow[];
    onCopy: (text: string) => void;
    onDelete: (cookie: CookieRow) => void;
    onSave: (cookie: CookieRow, value: string) => void;
};

const COLUMNS: readonly TableColumn[] = [
    { id: 'name', kind: 'fluid', min: 'sm', weight: 1 },
    { id: 'domain', kind: 'fluid', min: 'md', weight: 1.2 },
    { id: 'value', kind: 'fluid', min: 'md', weight: 1.5 },
];

/** The cookies of the jar, a line each, under the names of what each column says. */
export function CookieJarTable({ cookies, onCopy, onDelete, onSave }: CookieJarTableProps) {
    const labels = useMessages('cookies');

    return (
        <Table columns={COLUMNS} label={labels('title')}>
            <TableHead>
                <TableHeaderCell column="name">{labels('colName')}</TableHeaderCell>
                <TableHeaderCell column="domain">{labels('colDomain')}</TableHeaderCell>
                <TableHeaderCell column="value">{labels('colValue')}</TableHeaderCell>
                <TableTools label={labels('colActions')} />
            </TableHead>
            <tbody data-part="cookie-jar">
                {cookies.map((cookie) => (
                    <CookieJarRow
                        cookie={cookie}
                        key={`${cookie.domain}|${cookie.path}|${cookie.name}`}
                        onCopy={onCopy}
                        onDelete={onDelete}
                        onSave={onSave}
                    />
                ))}
            </tbody>
        </Table>
    );
}

import { useLanguage, useMessages } from '@mandor/i18n';
import type { HttpResponse, ResponseCookie } from '@mandor/schema';
import { useCopyText } from '@mandor/shell';
import {
    EmptyState,
    IconButton,
    Table,
    TableHead,
    TableHeaderCell,
    TableRowActions,
    TableTools,
    type TableColumn,
} from '@mandor/ui';

import { cookieExpiryOf, cookiePairOf } from './lib/cookie-cells.js';

type ResponseCookiesProps = {
    cookies: HttpResponse['cookies'];
};

const COLUMNS: readonly TableColumn[] = [
    { id: 'name', kind: 'fluid', min: 'sm', weight: 1 },
    { id: 'value', kind: 'fluid', min: 'md', weight: 2 },
    { id: 'domain', kind: 'fluid', min: 'sm', weight: 1 },
    { id: 'path', kind: 'fluid', min: 'sm', weight: 0.6 },
    { id: 'expires', kind: 'fluid', min: 'sm', weight: 1 },
    { id: 'httpOnly', kind: 'fluid', min: 'sm', weight: 0.6 },
    { id: 'secure', kind: 'fluid', min: 'sm', weight: 0.6 },
    { id: 'sameSite', kind: 'fluid', min: 'sm', weight: 0.6 },
];

/** The words of the protocol, as a `Set-Cookie` line writes them: they are not translated. */
const SAME_SITE_NAME = { lax: 'Lax', none: 'None', strict: 'Strict' } as const;

/**
 * The cookies this response set, a column for each thing their line said, as Postman lays them
 * out. Nothing is stored here: the jar keeps them, when the request rides with it.
 */
export function ResponseCookies({ cookies }: ResponseCookiesProps) {
    const labels = useMessages('requests');
    const copy = useCopyText();

    if (cookies.length === 0) {
        return (
            <EmptyState
                description={labels('cookiesEmpty')}
                icon="info"
                title={labels('cookiesEmptyTitle')}
            />
        );
    }

    return (
        <div
            className="flex h-full min-h-0 min-w-0 flex-col px-pad-panel py-pad-control"
            data-part="response-cookies"
        >
            <Table columns={COLUMNS} label={labels('cookies')}>
                <TableHead>
                    <TableHeaderCell column="name">{labels('columnName')}</TableHeaderCell>
                    <TableHeaderCell column="value">{labels('columnValue')}</TableHeaderCell>
                    <TableHeaderCell column="domain">{labels('columnDomain')}</TableHeaderCell>
                    <TableHeaderCell column="path">{labels('columnPath')}</TableHeaderCell>
                    <TableHeaderCell column="expires">{labels('columnExpires')}</TableHeaderCell>
                    <TableHeaderCell column="httpOnly">{labels('columnHttpOnly')}</TableHeaderCell>
                    <TableHeaderCell column="secure">{labels('columnSecure')}</TableHeaderCell>
                    <TableHeaderCell column="sameSite">{labels('columnSameSite')}</TableHeaderCell>
                    <TableTools label={labels('columnActions')}>
                        <IconButton
                            icon="copy"
                            label={labels('copyAll')}
                            onClick={() => {
                                copy(cookies.map(cookiePairOf).join('\n'));
                            }}
                            size="sm"
                        />
                    </TableTools>
                </TableHead>
                <tbody data-part="response-rows">
                    {cookies.map((cookie, index) => (
                        <CookieLine
                            cookie={cookie}
                            key={`${cookie.name}:${String(index)}`}
                            onCopy={copy}
                        />
                    ))}
                </tbody>
            </Table>
        </div>
    );
}

/** One cookie of the answer. Its copy is the pair a `Cookie` header would carry. */
function CookieLine({
    cookie,
    onCopy,
}: {
    cookie: ResponseCookie;
    onCopy: (text: string) => void;
}) {
    const labels = useMessages('requests');
    const language = useLanguage();

    return (
        <tr data-part="response-cookie">
            <td>{cookie.name}</td>
            <td>{cookie.value}</td>
            <td className="text-text-secondary">{cookie.domain}</td>
            <td className="text-text-secondary">{cookie.path}</td>
            <td className="text-text-secondary">
                {cookieExpiryOf(cookie.expires, language) ?? labels('cookieSession')}
            </td>
            <td className="text-text-secondary">{String(cookie.httpOnly)}</td>
            <td className="text-text-secondary">{String(cookie.secure)}</td>
            <td className="text-text-secondary">
                {cookie.sameSite === undefined ? null : SAME_SITE_NAME[cookie.sameSite]}
            </td>
            <TableRowActions>
                <IconButton
                    icon="copy"
                    label={labels('copy')}
                    onClick={() => {
                        onCopy(cookiePairOf(cookie));
                    }}
                    size="sm"
                />
            </TableRowActions>
        </tr>
    );
}

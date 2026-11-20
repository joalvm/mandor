import { Table, TableHead, TableHeaderCell, type TableColumn } from '@mandor/ui';

import { Preview, type TokenPreview } from './token-previews.js';
import { useRootAppearance } from './use-root-appearance.js';

export type TokenRow = {
    /** El nombre de la variable, sin `var()`: `--surface-panel`. */
    token: string;
    /** La utilidad de Tailwind que la escribe, si la hay. */
    utility?: string;
    /** Para qué existe. Nunca cuánto mide: eso lo dice la columna del valor. */
    note?: string;
};

type TokenTableProps = {
    /** Lo que la tabla enumera; viaja en el caption de la tabla. */
    caption: string;
    /** La muestra que dibuja cada token; sin ella, la tabla da solo el valor. */
    preview?: TokenPreview;
    rows: readonly TokenRow[];
};

const PREVIEW: TableColumn = { id: 'preview', kind: 'fluid', min: 'sm', weight: 0.5 };

/** The variable keeps the widest floor: a token name read across two lines reads as two names. */
const COLUMNS: readonly TableColumn[] = [
    { id: 'token', kind: 'fluid', min: 'lg', weight: 1.6 },
    { id: 'value', kind: 'fluid', min: 'sm', weight: 0.5 },
    { id: 'utility', kind: 'fluid', min: 'md', weight: 0.9 },
    { id: 'note', kind: 'fluid', min: 'lg', weight: 1.6 },
];

/** El valor que el navegador calcula para el token, en la apariencia de ahora. */
function TokenValue({ token }: { token: string }) {
    useRootAppearance();

    const value = getComputedStyle(document.documentElement).getPropertyValue(token).trim();

    return <span className="tabular">{value || '—'}</span>;
}

/** La celda de la muestra; ninguna si la tabla no dibuja muestras. */
function PreviewCell({ kind, token }: { kind: TokenPreview | undefined; token: string }) {
    if (kind === undefined) {
        return null;
    }

    return (
        <td>
            <Preview kind={kind} token={token} />
        </td>
    );
}

/** La cabecera de la muestra; ninguna si la tabla no dibuja muestras. */
function PreviewHeader({ kind }: { kind: TokenPreview | undefined }) {
    if (kind === undefined) {
        return null;
    }

    return <TableHeaderCell column="preview">Muestra</TableHeaderCell>;
}

/**
 * Una tabla de tokens: muestra, variable, valor, utilidad y una línea de para qué existe, sobre
 * la tabla común de la ventana, con el token como `th` de fila para que un lector de pantalla
 * sepa qué lee en cada celda. La muestra se pinta con la variable misma y el valor se lee del
 * navegador, así que los dos cambian con el tema y la densidad y nunca discrepan de lo que un
 * componente va a leer. Los huecos se materializan entre dos cajas iguales; los pads, vistiendo
 * una caja por dentro.
 */
export function TokenTable({ caption, preview, rows }: TokenTableProps) {
    return (
        <Table columns={preview === undefined ? COLUMNS : [PREVIEW, ...COLUMNS]} label={caption}>
            <TableHead>
                <PreviewHeader kind={preview} />
                <TableHeaderCell column="token">Variable</TableHeaderCell>
                <TableHeaderCell column="value">Valor</TableHeaderCell>
                <TableHeaderCell column="utility">Utilidad</TableHeaderCell>
                <TableHeaderCell column="note">Uso</TableHeaderCell>
            </TableHead>
            <tbody data-part="token-table">
                {rows.map((row) => (
                    <tr key={row.token}>
                        <PreviewCell kind={preview} token={row.token} />
                        <th className="font-mono text-xs" scope="row">
                            {row.token}
                        </th>
                        <td className="font-mono text-xs text-text-secondary">
                            <TokenValue token={row.token} />
                        </td>
                        <td
                            className={`font-mono text-xs ${
                                row.utility === undefined
                                    ? 'text-text-disabled'
                                    : 'text-text-secondary'
                            }`}
                        >
                            {row.utility ?? '—'}
                        </td>
                        <td className="text-xs text-text-secondary">{row.note ?? ''}</td>
                    </tr>
                ))}
            </tbody>
        </Table>
    );
}

import { Table, TableHead, TableHeaderCell, type TableColumn } from '@mandor/ui';

import { Preview, type TokenPreview } from './token-previews.js';

export type TokenRow = {
    /** El nombre de la variable, sin `var()`: `--surface-panel`. */
    token: string;
    /** La utilidad de Tailwind que la escribe, si la hay. */
    utility?: string;
    note?: string;
};

type TokenTableProps = {
    /** Lo que la tabla enumera; viaja en el caption de la tabla. */
    caption: string;
    preview: TokenPreview;
    rows: readonly TokenRow[];
};

const COLUMNS: readonly TableColumn[] = [
    { id: 'preview', kind: 'fluid', min: 'sm', weight: 0.6 },
    { id: 'token', kind: 'fluid', min: 'md', weight: 1.2 },
    { id: 'utility', kind: 'fluid', min: 'md', weight: 1 },
    { id: 'note', kind: 'fluid', min: 'lg', weight: 2 },
];

/**
 * Una tabla de tokens: muestra, variable, utilidad y una línea de para qué existe, sobre la
 * tabla común de la ventana, con el token como `th` de fila para que un lector de pantalla sepa
 * qué lee en cada celda. La muestra se pinta con la variable misma, así que cambia de tema con
 * la página y nunca discrepa de lo que un componente va a leer. Los huecos se materializan
 * entre dos cajas iguales; los pads, vistiendo una caja por dentro.
 */
export function TokenTable({ caption, preview, rows }: TokenTableProps) {
    return (
        <Table columns={COLUMNS} label={caption}>
            <TableHead>
                <TableHeaderCell column="preview">Muestra</TableHeaderCell>
                <TableHeaderCell column="token">Variable</TableHeaderCell>
                <TableHeaderCell column="utility">Utilidad</TableHeaderCell>
                <TableHeaderCell column="note">Uso</TableHeaderCell>
            </TableHead>
            <tbody data-part="token-table">
                {rows.map((row) => (
                    <tr key={row.token}>
                        <td>
                            <Preview kind={preview} token={row.token} />
                        </td>
                        <th className="font-mono text-xs" scope="row">
                            {row.token}
                        </th>
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

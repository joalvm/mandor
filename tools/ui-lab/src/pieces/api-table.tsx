import { Table, TableHead, TableHeaderCell, type TableColumn } from '@mandor/ui';

type ApiRow = {
    /** El nombre de la prop, tal y como se escribe en el componente. */
    name: string;
    /** El tipo exacto del paquete, sin acortar. */
    type: string;
    /** El valor que toma cuando no se pasa. */
    def?: string;
    note?: string;
};

type ApiTableProps = {
    /** Lo que la tabla enumera; viaja en el caption de la tabla. */
    caption: string;
    rows: readonly ApiRow[];
};

const COLUMNS: readonly TableColumn[] = [
    { id: 'prop', kind: 'fluid', min: 'md', weight: 1.2 },
    { id: 'type', kind: 'fluid', min: 'md', weight: 1.6 },
    { id: 'default', kind: 'fluid', min: 'sm', weight: 0.7 },
    { id: 'note', kind: 'fluid', min: 'lg', weight: 2 },
];

/**
 * La API de un componente: prop, tipo, defecto y una línea de para qué existe, sobre la tabla
 * común de la ventana, con la prop como `th` de fila. Los tipos salen del paquete real: si el
 * componente cambia y la tabla no, la página miente, así que la tabla se escribe junto al
 * componente y se revisa en la misma pasada.
 */
export function ApiTable({ caption, rows }: ApiTableProps) {
    return (
        <Table columns={COLUMNS} label={caption}>
            <TableHead>
                <TableHeaderCell column="prop">Prop</TableHeaderCell>
                <TableHeaderCell column="type">Tipo</TableHeaderCell>
                <TableHeaderCell column="default">Defecto</TableHeaderCell>
                <TableHeaderCell column="note">Uso</TableHeaderCell>
            </TableHead>
            <tbody data-part="api-table">
                {rows.map((row) => (
                    <tr key={row.name}>
                        <th className="font-mono text-xs" scope="row">
                            {row.name}
                        </th>
                        <td className="font-mono text-xs text-text-secondary">{row.type}</td>
                        <td
                            className={`font-mono text-xs ${
                                row.def === undefined ? 'text-text-disabled' : 'text-text-secondary'
                            }`}
                        >
                            {row.def ?? '—'}
                        </td>
                        <td className="text-xs text-text-secondary">{row.note ?? ''}</td>
                    </tr>
                ))}
            </tbody>
        </Table>
    );
}

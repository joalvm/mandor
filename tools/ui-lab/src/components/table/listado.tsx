import {
    IconButton,
    StatusDot,
    Table,
    TableHead,
    TableHeaderCell,
    TableRowActions,
    TableTools,
    type TableColumn,
} from '@mandor/ui';

type Origen = {
    address: string;
    id: string;
    name: string;
    state: 'connected' | 'error' | 'warning';
    status: string;
};

const ORIGENES: readonly Origen[] = [
    { address: 'En este equipo', id: 'local', name: 'Local', state: 'connected', status: 'Al día' },
    {
        address: 'github.com/equipo/apis',
        id: 'equipo',
        name: 'Equipo',
        state: 'warning',
        status: 'Sin enviar',
    },
    {
        address: 'gitlab.example.com/qa/contratos',
        id: 'qa',
        name: 'QA',
        state: 'error',
        status: 'No responde',
    },
];

const COLUMNS: readonly TableColumn[] = [
    { id: 'name', kind: 'fluid', min: 'md', weight: 1 },
    { id: 'address', kind: 'fluid', min: 'md', weight: 1.4 },
    { id: 'status', kind: 'fluid', min: 'md', weight: 1 },
];

/**
 * Un listado: cada fila es algo sobre lo que se actúa, así que sus acciones están siempre a la
 * vista y la fila se vela bajo el puntero. Las columnas se arrastran desde su borde derecho.
 */
export function ListadoDemo() {
    return (
        <Table columns={COLUMNS} label="Orígenes">
            <TableHead>
                <TableHeaderCell column="name">Origen</TableHeaderCell>
                <TableHeaderCell column="address">Dirección</TableHeaderCell>
                <TableHeaderCell column="status">Estado</TableHeaderCell>
                <TableTools label="Acciones" />
            </TableHead>
            <tbody>
                {ORIGENES.map((origen) => (
                    <tr key={origen.id}>
                        <td>{origen.name}</td>
                        <td className="text-text-secondary">
                            <span className="min-w-0 truncate">{origen.address}</span>
                        </td>
                        <td className="gap-gap-icon-text text-text-secondary">
                            <StatusDot label={origen.status} state={origen.state} />
                            <span className="min-w-0 truncate">{origen.status}</span>
                        </td>
                        <TableRowActions reveal="always">
                            <IconButton icon="refresh" label={`Comprobar ${origen.name}`} />
                            <IconButton icon="delete" label={`Quitar ${origen.name}`} />
                        </TableRowActions>
                    </tr>
                ))}
            </tbody>
        </Table>
    );
}

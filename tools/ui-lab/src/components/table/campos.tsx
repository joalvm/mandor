import {
    IconButton,
    Input,
    Table,
    TableHead,
    TableHeaderCell,
    TableRowActions,
    TableTools,
    type TableColumn,
} from '@mandor/ui';
import { useState } from 'react';

type Cabecera = { id: string; name: string; value: string };

const INICIALES: readonly Cabecera[] = [
    { id: '0', name: 'Accept', value: 'application/json' },
    { id: '1', name: 'Authorization', value: 'Bearer {{token}}' },
    { id: '2', name: 'X-Request-Id', value: '{{$guid}}' },
];

const COLUMNS: readonly TableColumn[] = [
    { id: 'name', kind: 'fluid', min: 'md', weight: 1 },
    { id: 'value', kind: 'fluid', min: 'lg', weight: 2 },
];

function cambiado(lines: readonly Cabecera[], id: string, patch: Partial<Cabecera>): Cabecera[] {
    return lines.map((line) => (line.id === id ? { ...line, ...patch } : line));
}

/**
 * Una tabla de campos: cada celda responde sola al puntero, así que la fila no se vela, y la
 * acción de la fila aparece al apuntarla o al llegar con el foco.
 */
export function CamposDemo() {
    const [lines, setLines] = useState<readonly Cabecera[]>(INICIALES);

    return (
        <Table columns={COLUMNS} label="Cabeceras" rowHover={false}>
            <TableHead>
                <TableHeaderCell column="name">Nombre</TableHeaderCell>
                <TableHeaderCell column="value">Valor</TableHeaderCell>
                <TableTools label="Acciones" />
            </TableHead>
            <tbody>
                {lines.map((line) => (
                    <tr key={line.id}>
                        <td>
                            <Input
                                label={`Nombre de la cabecera ${line.id}`}
                                onValueChange={(name) => {
                                    setLines(cambiado(lines, line.id, { name }));
                                }}
                                value={line.name}
                                variant="flat"
                            />
                        </td>
                        <td>
                            <Input
                                label={`Valor de ${line.name}`}
                                onValueChange={(value) => {
                                    setLines(cambiado(lines, line.id, { value }));
                                }}
                                value={line.value}
                                variant="flat"
                            />
                        </td>
                        <TableRowActions>
                            <IconButton
                                icon="delete"
                                label={`Quitar ${line.name}`}
                                onClick={() => {
                                    setLines(lines.filter((each) => each.id !== line.id));
                                }}
                            />
                        </TableRowActions>
                    </tr>
                ))}
            </tbody>
        </Table>
    );
}

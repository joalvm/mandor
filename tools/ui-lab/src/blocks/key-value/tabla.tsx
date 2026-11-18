import { MessagesProvider } from '@mandor/i18n';
import { KeyValueTable, type KeyValueColumns, type KeyValueLine } from '@mandor/env';
import { useState, type ReactNode } from 'react';

const INICIALES: KeyValueLine[] = [
    { disabled: false, id: '0', name: 'responsables[]', value: '1' },
    { disabled: false, id: '1', name: 'advertisers[]', value: '1', meta: { type: 'number' } },
    { disabled: false, id: '2', name: 'status[]', value: 'pending,finalized' },
    {
        description: 'Fecha de inicio del informe',
        disabled: false,
        id: '3',
        name: 'start',
        value: '2024-07-16',
    },
    { disabled: true, id: '4', name: 'custom_status[active]', value: 'active' },
    {
        description: 'Token del entorno de la conexión',
        disabled: false,
        id: '5',
        name: 'token',
        value: '{{token}}',
    },
];

/** La tabla de pares con tipos: la cara de los parámetros de una petición. */
export function TablaDemo(): ReactNode {
    const [lines, setLines] = useState(INICIALES);
    const [columns, setColumns] = useState<KeyValueColumns>({ description: false, value: true });

    return (
        <MessagesProvider preferences={{ language: 'es' }}>
            <KeyValueTable
                columns={columns}
                environment={undefined}
                lines={lines}
                onColumnsChange={setColumns}
                onLinesChange={(next) => {
                    setLines([...next]);
                }}
                onVariablesChange={() => undefined}
                title="Parámetros de consulta"
                typed
            />
        </MessagesProvider>
    );
}

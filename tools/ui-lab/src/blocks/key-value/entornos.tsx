import { MessagesProvider } from '@mandor/i18n';
import { Input } from '@mandor/ui';
import { KeyValueTable, type KeyValueLine } from '@mandor/env';
import { useState, type ReactNode } from 'react';

const INICIALES: KeyValueLine[] = [
    { disabled: false, id: '0', name: 'base_url', value: 'http://localhost:81' },
    { disabled: false, id: '1', name: 'api_token', secret: true, value: 'hx7_qW2mRt9vL4pX' },
    { disabled: false, id: '2', name: 'page_size', value: '50' },
    { disabled: true, id: '3', name: 'retired_host', value: '10.0.0.3' },
];

/**
 * Las entradas de un entorno: la misma tabla, llana —sin tipos, sin masivo, sin menú de
 * columnas— y con la marca de secreta como único extra. El valor aquí es literal: este es
 * el lugar donde las variables nacen, no donde se hablan, así que las celdas no sugieren.
 */
export function EntornosDemo(): ReactNode {
    const [lines, setLines] = useState(INICIALES);
    const [name, setName] = useState('Local');

    return (
        <MessagesProvider preferences={{ language: 'es' }}>
            <div className="flex flex-col gap-gap-group">
                <Input label="Nombre del entorno" onValueChange={setName} value={name} />
                <KeyValueTable
                    bulkEdit={false}
                    columnMenu={false}
                    columns={{ description: false, value: true }}
                    environment={undefined}
                    lines={lines}
                    onColumnsChange={() => undefined}
                    onLinesChange={(next) => {
                        setLines([...next]);
                    }}
                    onVariablesChange={() => undefined}
                    secretable
                    title="Variables"
                    typed={false}
                    variables={false}
                />
            </div>
        </MessagesProvider>
    );
}

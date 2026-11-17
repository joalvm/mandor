import { MessagesProvider } from '@mandor/i18n';
import {
    KEY_HEADER_NAMES,
    KeyValueTable,
    type KeyValueAutoLine,
    type KeyValueColumns,
    type KeyValueLine,
    type KeyValuePreset,
} from '@mandor/env';
import { useState, type ReactNode } from 'react';

const INICIALES: KeyValueLine[] = [
    { disabled: false, id: '0', name: '{{device_key}}', value: '{{deviceType}}' },
    { disabled: false, id: '1', name: 'User-Agent', value: '{{user_agent}}' },
    { disabled: true, id: '2', name: 'Accept-Language', value: '{{accept_language}}' },
];

const ANADIDAS: KeyValueAutoLine[] = [
    {
        description: 'La autorización efectiva de la pestaña Authorization',
        follow: { label: 'Ir a Authorization' },
        id: 'auth',
        locked: true,
        name: 'Authorization',
        value: 'Bearer ••••••••',
    },
    {
        description: 'La añade quien envía: la respuesta se lee vivo, no de caché',
        id: 'cache',
        locked: true,
        name: 'Cache-Control',
        value: 'no-cache',
    },
    {
        description: 'El tipo del cuerpo en la pestaña Body',
        follow: { label: 'Ir a Body' },
        id: 'ct',
        name: 'Content-Type',
        value: 'application/json',
    },
    {
        calculated: true,
        description: 'La calcula quien envía con el cuerpo',
        id: 'len',
        name: 'Content-Length',
        value: '',
    },
    {
        calculated: true,
        description: 'La calcula quien envía con la dirección',
        id: 'host',
        name: 'Host',
        value: '',
    },
    {
        description: 'Quien envía se presenta; la pisa la fila User-Agent de la tabla',
        id: 'ua',
        name: 'User-Agent',
        overriddenBy: 'User-Agent',
        value: 'Mandor/1.0',
    },
    {
        description: 'Lo que se acepta de vuelta',
        id: 'accept',
        name: 'Accept',
        value: '*/*',
    },
    {
        description: 'La compresión que quien envía entiende',
        id: 'aenc',
        name: 'Accept-Encoding',
        value: 'gzip, deflate, br, zstd',
    },
    {
        description: 'La conexión se reusa entre peticiones',
        id: 'conn',
        name: 'Connection',
        value: 'keep-alive',
    },
];

const PREAJUSTES: KeyValuePreset[] = [
    {
        id: 'web',
        lines: [
            { disabled: false, id: '0', name: 'Accept', value: 'text/html' },
            { disabled: false, id: '1', name: 'Accept-Language', value: 'es-ES,es' },
        ],
        name: 'web',
    },
];

/** La misma tabla, pedida para las cabeceras: claves que se sugieren, filas que la app añade y preajustes. */
export function CabecerasDemo(): ReactNode {
    const [lines, setLines] = useState(INICIALES);
    const [columns, setColumns] = useState<KeyValueColumns>({ description: false, value: true });
    const [anadidas, setAnadidas] = useState(ANADIDAS);
    const [presets, setPresets] = useState(PREAJUSTES);

    return (
        <MessagesProvider preferences={{ language: 'es' }}>
            <KeyValueTable
                autoLines={anadidas}
                columns={columns}
                environment={undefined}
                keySuggestions={KEY_HEADER_NAMES}
                lines={lines}
                onAutoFollow={() => undefined}
                onAutoLinesChange={(next) => {
                    setAnadidas([...next]);
                }}
                onColumnsChange={setColumns}
                onLinesChange={(next) => {
                    setLines([...next]);
                }}
                onPresetsChange={(next) => {
                    setPresets([...next]);
                }}
                onVariablesChange={() => undefined}
                presets={presets}
                title="Cabeceras"
                typed
            />
        </MessagesProvider>
    );
}

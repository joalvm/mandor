import { Demo } from '../../pieces/demo.js';
import { DocPage } from '../../pieces/doc-page.js';
import { CONNECTION_TREE, REQUEST_TREE } from './exchange-data.js';
import exportCode from './export-demo.tsx?raw';
import { ExportDemo } from './export-demo.js';
import importCode from './import-demo.tsx?raw';
import { ImportDemo } from './import-demo.js';

const REQUEST_FORMATS = [
    { label: 'OpenAPI', value: 'openapi' },
    { label: 'Postman', value: 'postman' },
    { label: 'Insomnia', value: 'insomnia' },
    { label: 'Bruno', value: 'bruno' },
];

const CONNECTION_FORMATS = [
    { label: 'AsyncAPI', value: 'asyncapi' },
    { label: 'Insomnia', value: 'insomnia' },
    { label: 'Bruno', value: 'bruno' },
];

/** Intercambio: las ventanas de importar y exportar de las dos apps sobre el mismo árbol. */
export function ExchangePage() {
    return (
        <DocPage
            lead="Importar y exportar son el mismo árbol de elección en dos ventanas. Boceto con las
                piezas de @mandor/ui: el chevron del árbol es una prop, la casilla elige, pulsar una
                carpeta la pliega."
            title="Importar y exportar"
        >
            <Demo
                code={exportCode}
                heading="Exportar, Mandor Request"
                intent="El formato a la izquierda del pie, junto al botón que lo ejecuta; arriba, solo lo que se elige."
            >
                <ExportDemo formats={REQUEST_FORMATS} root={REQUEST_TREE} />
            </Demo>

            <Demo
                code={exportCode}
                heading="Exportar, Mandor Realtime"
                intent="La misma ventana con las conexiones y los eventos; solo cambian los formatos."
            >
                <ExportDemo formats={CONNECTION_FORMATS} root={CONNECTION_TREE} />
            </Demo>

            <Demo
                code={importCode}
                heading="Importar, Mandor Request"
                intent="Primero el archivo; leído, lo que trae para dejar entrar. El pie lleva una sola respuesta."
            >
                <ImportDemo
                    file="tienda.openapi.yaml"
                    formats="OpenAPI · Postman · Insomnia · Bruno · HAR · curl"
                    root={REQUEST_TREE}
                />
            </Demo>

            <Demo
                code={importCode}
                heading="Importar, Mandor Realtime"
                intent="Lo mismo con los formatos de conexión."
            >
                <ImportDemo
                    file="dispositivos.asyncapi.yaml"
                    formats="AsyncAPI · Insomnia · Bruno"
                    root={CONNECTION_TREE}
                />
            </Demo>
        </DocPage>
    );
}

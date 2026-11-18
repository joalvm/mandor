import { ApiTable } from '../../pieces/api-table.js';
import { DocPage } from '../../pieces/doc-page.js';
import { DocSection } from '../../pieces/doc-section.js';
import { Demo } from '../../pieces/demo.js';
import { Trama } from './trama.js';
import tramaCode from './trama.tsx?raw';

const HEX_VIEW_API = [
    {
        name: 'bytes',
        type: 'Uint8Array',
        def: '—',
        note: 'Lo que llegó. La vista lo lee; nada aquí escribe.',
    },
    {
        name: 'labels',
        type: '{ bytesPerRow; copy; editor; hideText; showText }',
        def: '—',
        note: 'Las palabras de la banda y del editor que la vista monta por debajo.',
    },
    {
        name: 'modelKey',
        type: 'string',
        def: '—',
        note: 'La clave del documento del vuelco: el vuelco de una trama se guarda bajo la suya.',
    },
] as const;

/** Una trama que nunca fue texto, leída como bytes: la banda del lector y el vuelco. */
export function HexViewPage() {
    return (
        <DocPage
            lead="Una trama que llegó como bytes, leída como vuelco hexadecimal: dirección, bytes y lo que deletrean, al lado. Lee, no escribe."
            title="HexView"
        >
            <DocSection heading="Leyendo una trama">
                <Demo
                    code={tramaCode}
                    heading="Vuelco con banda de lectura"
                    intent="Cambia el ancho de línea, oculta el texto deletreado y copia el vuelco entero."
                >
                    <Trama />
                </Demo>
            </DocSection>
            <DocSection heading="API">
                <ApiTable caption="Props de HexView" rows={HEX_VIEW_API} />
            </DocSection>
            <DocSection heading="Reglas">
                <ul className="flex list-disc flex-col gap-gap-control pl-6 text-sm text-text-secondary">
                    <li>
                        La banda es una barra de herramientas, no una fila de lista: alto de sección
                        (32), como toda banda que lleva controles sobre un panel.
                    </li>
                    <li>
                        El menú del editor copia la selección; el botón de la banda copia el vuelco
                        entero. Dos copias con dos alcances, cada una con su sitio.
                    </li>
                    <li>
                        Por debajo es un <code className="font-mono text-xs">CodeEditor</code>{' '}
                        <code className="font-mono text-xs">binary</code>: solo lectura siempre, sin
                        cursor y sin marcas.
                    </li>
                </ul>
            </DocSection>
        </DocPage>
    );
}

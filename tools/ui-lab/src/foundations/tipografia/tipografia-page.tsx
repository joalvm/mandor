import escalaCode from './escala.tsx?raw';
import { EscalaDemo } from './escala.js';
import formasCode from './formas.tsx?raw';
import { FormasDemo } from './formas.js';
import { DocPage } from '../../pieces/doc-page.js';
import { DocSection } from '../../pieces/doc-section.js';
import { Demo } from '../../pieces/demo.js';

export function TipografiaPage() {
    return (
        <DocPage
            lead="Dos familias, una escala cerrada y dos pesos. Inter Variable es la voz de la
                interfaz; IBM Plex Mono solo habla cuando el contenido es código. Entre las dos no
                hay tercera familia, y fuera de la escala no hay tamaño."
            title="Tipografía"
        >
            <DocSection
                heading="Familias"
                intent="La de interfaz para leer; la de código para lo que una máquina escribiría. Nunca al revés."
            >
                <div className="flex flex-col gap-gap-control">
                    <div>
                        <p className="text-md text-text-primary">
                            Inter Variable — conexiones locales
                        </p>
                        <p className="text-xs text-text-secondary">--mandor-font-ui</p>
                    </div>
                    <div>
                        <p className="font-mono text-md text-text-primary">
                            IBM Plex Mono — {'{ "path": "/ws/turno" }'}
                        </p>
                        <p className="text-xs text-text-secondary">--mandor-font-mono</p>
                    </div>
                </div>
            </DocSection>

            <Demo
                code={escalaCode}
                heading="La escala"
                intent="Cada paso con el trabajo que le toca. Se pide con la utilidad del tema, nunca con un tamaño escrito."
            >
                <EscalaDemo />
            </Demo>

            <Demo
                code={formasCode}
                heading="Pesos, números y mayúsculas"
                intent="Regular para leer, semibold para nombrar. Las cifras en columna llevan tabular; las mayúsculas son solo del microtexto."
            >
                <FormasDemo />
            </Demo>

            <DocSection heading="Reglas">
                <ul className="flex list-disc flex-col gap-gap-tight pl-4 text-sm text-text-secondary">
                    <li>
                        El tamaño se pide con <code className="font-mono text-xs">text-sm</code> y
                        compañía, que traen línea y tracking de la escala. Un
                        <code className="font-mono text-xs"> text-[13px]</code> no pasa la
                        comprobación.
                    </li>
                    <li>
                        Solo dos pesos existen: 400 y 600. Un tercero sería otro sistema dentro de
                        este.
                    </li>
                    <li>
                        La fuente de código entra en textos y en controles de valor; la de interfaz
                        nunca entra al editor.
                    </li>
                </ul>
            </DocSection>
        </DocPage>
    );
}

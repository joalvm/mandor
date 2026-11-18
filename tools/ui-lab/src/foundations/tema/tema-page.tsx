import dosTemasCode from './dos-temas.tsx?raw';
import { DosTemasDemo } from './dos-temas.js';
import { DocPage } from '../../pieces/doc-page.js';
import { DocSection } from '../../pieces/doc-section.js';
import { Demo } from '../../pieces/demo.js';

export function TemaPage() {
    return (
        <DocPage
            lead="Dos temas, un solo juego de nombres: el semántico resuelve a una rampa u otra según
                el atributo data-theme de la raíz del documento, y sin atributo manda el esquema del
                sistema. Cambia el tema de arriba y todo lo de esta plataforma responde a la vez:
                las muestras, las demos y los componentes montados."
            title="Tema"
        >
            <Demo
                code={dosTemasCode}
                heading="El mismo contenido, dos temas"
                intent="Cada mitad fuerza su tema con data-theme: no son capturas, son los mismos componentes dibujados dos veces."
            >
                <DosTemasDemo />
            </Demo>

            <DocSection
                heading="Cómo conmuta"
                intent="Tres estados, el mismo mecanismo que PreferencesApplication pone en las apps."
            >
                <ul className="flex flex-col gap-gap-control text-sm">
                    {[
                        {
                            choice: 'sin atributo',
                            role: 'sigue al sistema: semantic-dark.css responde al media query prefers-color-scheme',
                        },
                        { choice: 'data-theme="light"', role: 'tema claro, se ignore el sistema' },
                        { choice: 'data-theme="dark"', role: 'tema oscuro, se ignore el sistema' },
                    ].map((entry) => (
                        <li className="flex flex-col" key={entry.choice}>
                            <code className="font-mono text-xs">{entry.choice}</code>
                            <span className="text-text-secondary">{entry.role}</span>
                        </li>
                    ))}
                </ul>
            </DocSection>

            <DocSection heading="Reglas">
                <ul className="flex list-disc flex-col gap-gap-tight pl-4 text-sm text-text-secondary">
                    <li>
                        Un componente nunca pregunta por el tema: no hay{' '}
                        <code className="font-mono text-xs">isDark</code> ni dos clases. Si algo
                        cambia de tema, es porque su variable cambió de rampa.
                    </li>
                    <li>
                        Las primitivas no conmutan: la rampa de claro y la de oscuro existen
                        siempre, y es el semántico quien elige.
                    </li>
                    <li>
                        El editor usa el tema de Monaco, claro u oscuro según la ventana, y la
                        fuente mono del producto.
                    </li>
                </ul>
            </DocSection>
        </DocPage>
    );
}

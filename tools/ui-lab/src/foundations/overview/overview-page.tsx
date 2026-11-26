import { DocPage } from '../../pieces/doc-page.js';
import { DocSection } from '../../pieces/doc-section.js';

const SHEETS: readonly { role: string; sheet: string }[] = [
    {
        sheet: 'primitives.css',
        role: 'Rampas crudas: neutral, las dos de marca y estado, en claro y en oscuro, y el acento, que data-accent en la raíz apunta a una de marca. Nadie las escribe en una plantilla.',
    },
    {
        sheet: 'semantic.css',
        role: 'El juego semántico del tema claro: superficies, texto, bordes, sólidos y foco.',
    },
    {
        sheet: 'semantic-dark.css',
        role: 'Lo mismo en oscuro: con data-theme en la raíz o con el esquema del sistema.',
    },
    {
        sheet: 'scales.css',
        role: 'La escala cerrada: tipografía, alturas, espaciado, radios, sombras, capas y movimiento.',
    },
    { sheet: 'base.css', role: 'El contrato del documento: fondo, texto, scrollbars de 4 px.' },
    {
        sheet: 'runtime.css',
        role: 'Comportamiento escrito una vez: el foco, la barra de título, el plegado, el token de variable.',
    },
    {
        sheet: 'editor.css',
        role: 'Las variables dentro del editor, en cursiva y sin color propio.',
    },
    {
        sheet: 'token-values.ts',
        role: 'Los valores en TypeScript de donde npm run tokens genera las hojas. No se edita.',
    },
];

const RULES: readonly string[] = [
    'El nombre dice el papel, no el color: bg-surface-card, nunca bg-white. Una paleta cruda de Tailwind no pasa la comprobación de contratos.',
    'El acento entra solo en foco, acción primaria, lo encendido y la marca —teal en Realtime, naranja en Request—; los estados son gris. El editor no lleva acento.',
    'Un estado nunca se comunica solo con color: lleva texto o icono al lado.',
    'La escala es cerrada: ninguna altura, hueco o radio fuera de ella. Un escalón nuevo es un token en scales.css, un alias en el tema de Tailwind y npm run tokens.',
    'Los tokens se generan: npm run tokens reescribe las hojas desde token-values.ts, y verify falla si alguna quedó atrás.',
    'npm run design comprueba el marcado: foco, huecos, landmarks, valores arbitrarios y tokens repetidos.',
];

function Term({ children }: { children: string }) {
    return <code className="font-mono text-xs">{children}</code>;
}

export function OverviewPage() {
    return (
        <DocPage
            lead="El sistema es dos capas de color, una escala cerrada de geometría y un puñado de
                reglas que se comprueban solas. Esta plataforma monta los componentes reales de
                @mandor/ui con las hojas reales de packages/ui/src/styles/ para revisarlo
                funcionando, en los dos temas."
            title="Visión general"
        >
            <DocSection
                heading="Cómo está hecho"
                intent="Tres pasos, y cada uno solo conoce al anterior: la rampa cruda, el nombre semántico y la utilidad que se escribe."
            >
                <ol className="list-decimal pl-4 text-sm text-text-secondary">
                    <li>
                        Las <strong className="text-text-primary">primitivas</strong> son rampas de
                        Radix más la de marca: números, sin intención.
                    </li>
                    <li>
                        Los <strong className="text-text-primary">semánticos</strong> les ponen
                        nombre de papel: <Term>--surface-card</Term> es «el fondo de una tarjeta»,
                        en claro y en oscuro.
                    </li>
                    <li>
                        El <strong className="text-text-primary">tema de Tailwind</strong> los
                        publica como utilidades: <Term>bg-surface-card</Term>,{' '}
                        <Term>text-text-primary</Term>, <Term>h-control</Term>,{' '}
                        <Term>rounded-md</Term>.
                    </li>
                </ol>
            </DocSection>

            <DocSection
                heading="Las hojas"
                intent="Viven en packages/ui/src/styles/. Esta plataforma importa la misma pila que las apps."
            >
                <ul className="flex flex-col gap-gap-control">
                    {SHEETS.map((entry) => (
                        <li className="flex gap-gap-control text-sm" key={entry.sheet}>
                            <code className="w-52 shrink-0 font-mono text-xs">{entry.sheet}</code>
                            <span className="text-text-secondary">{entry.role}</span>
                        </li>
                    ))}
                </ul>
            </DocSection>

            <DocSection heading="Las reglas">
                <ul className="flex list-disc flex-col gap-gap-tight pl-4 text-sm text-text-secondary">
                    {RULES.map((rule) => (
                        <li key={rule}>{rule}</li>
                    ))}
                </ul>
            </DocSection>

            <DocSection
                heading="Densidad"
                intent="Todo escala de cuatro: huecos de 4 a 24, controles de 22 a 40. Sin alturas ni huecos arbitrarios."
            >
                <p className="text-sm text-text-secondary">
                    Las páginas de{' '}
                    <a className="text-text-accent underline" href="#/foundations/alturas">
                        alturas
                    </a>{' '}
                    y{' '}
                    <a className="text-text-accent underline" href="#/foundations/espaciado">
                        espaciado
                    </a>{' '}
                    muestran la escala completa con componentes reales.
                </p>
            </DocSection>
        </DocPage>
    );
}

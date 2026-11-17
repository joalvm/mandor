import controlesCode from './controles.tsx?raw';
import { ControlesDemo } from './controles.js';
import { DocPage } from '../../pieces/doc-page.js';
import { DocSection } from '../../pieces/doc-section.js';
import { Demo } from '../../pieces/demo.js';
import { TokenTable } from '../../pieces/token-table.js';

const HEIGHTS: readonly { note?: string; token: string; utility?: string }[] = [
    {
        token: '--mandor-height-control-xs',
        utility: 'h-control-xs',
        note: '22 px — el control más chico: dentro de una fila apretada',
    },
    {
        token: '--mandor-height-control-sm',
        utility: 'h-control-sm',
        note: '24 px — el compacto, alineado con el tab y la statusbar',
    },
    { token: '--mandor-height-tab', utility: 'h-tab', note: '24 px — la pestaña de dockview' },
    {
        token: '--mandor-height-row-xs',
        utility: 'h-row-xs',
        note: '24 px — la fila de árbol comprimida',
    },
    { token: '--mandor-height-field', utility: 'h-field', note: '26 px — la caja de campo' },
    { token: '--mandor-height-row', utility: 'h-row', note: '28 px — la fila de lista' },
    {
        token: '--mandor-height-row-pair',
        utility: 'h-row-pair',
        note: '44 px — la fila de dos líneas: un nombre y lo que dice de él',
    },
    {
        token: '--mandor-height-control',
        utility: 'h-control',
        note: '28 px — el control normal: botón, switch, select',
    },
    {
        token: '--mandor-height-section',
        utility: 'h-section',
        note: '32 px — la cabecera de sección',
    },
    {
        token: '--mandor-height-header',
        utility: 'h-header',
        note: '40 px — la cabecera de una vista',
    },
    {
        token: '--mandor-height-titlebar',
        utility: 'h-titlebar',
        note: '40 px — la barra de título de la ventana',
    },
    {
        token: '--mandor-height-statusbar',
        utility: 'h-statusbar',
        note: '24 px — la barra de estado',
    },
];

const WIDTHS: readonly { note?: string; token: string; utility?: string }[] = [
    {
        token: '--mandor-width-sidebar',
        utility: 'w-sidebar',
        note: '260 px — el lateral de navegación',
    },
    {
        token: '--mandor-width-settings-nav',
        utility: 'w-settings-nav',
        note: '224 px — el lateral de preferencias',
    },
    { token: '--mandor-width-toggle', utility: 'w-toggle', note: '40 px — la pastilla del switch' },
    {
        token: '--mandor-width-dialog-confirm',
        note: '400 px — el diálogo de confirmación; lo pone el diálogo',
    },
    {
        token: '--mandor-width-dialog-form',
        note: '520 px — el diálogo con formulario; lo pone el diálogo',
    },
    {
        token: '--mandor-width-dialog-sections',
        note: '880 px — el diálogo de secciones; lo pone el diálogo',
    },
    {
        token: '--mandor-width-dialog-code',
        note: '880 px — el diálogo que muestra código; mediano, la ventana lo recorta',
    },
    {
        token: '--mandor-width-tooltip',
        note: '320 px — el ancho máximo del tooltip; lo pone el tooltip',
    },
];

export function AlturasPage() {
    return (
        <DocPage
            lead="La altura no se adivina: se pide. Once escalones cubren todo lo que la interfaz
                dibuja, de un microcontrol a la barra de título, y el ancho pertenece a quien
                coloca, no al control. Esta es la página que intraled no necesitó y Mandor sí."
            title="Alturas"
        >
            <Demo
                code={controlesCode}
                heading="Controles reales"
                intent="El botón normal, el compacto, la caja de campo y una fila de lista, en sus alturas de verdad."
                layout="start"
            >
                <ControlesDemo />
            </Demo>

            <DocSection
                heading="Las once alturas"
                intent="De chico a grande. La muestra es la altura misma: lo que mide el token, mide la barra."
            >
                <TokenTable caption="Las doce alturas" preview="height" rows={HEIGHTS} />
            </DocSection>

            <DocSection
                heading="Los anchos"
                intent="Dos laterales, la pastilla del switch y los anchos de diálogo. El resto del ancho lo decide la rejilla que coloca."
            >
                <TokenTable caption="Los anchos" preview="width" rows={WIDTHS} />
            </DocSection>

            <DocSection
                heading="Las barras de desplazamiento"
                intent="Heredadas desde la raíz: thin y del color del borde al pasar. Ningún panel declara la suya."
            >
                <ul className="flex list-disc flex-col gap-gap-tight pl-4 text-sm text-text-secondary">
                    <li>
                        <code className="font-mono text-xs">scrollbar-width: thin</code> y{' '}
                        <code className="font-mono text-xs">scrollbar-color</code> se declaran una
                        vez en <code className="font-mono text-xs">base.css</code> y heredan a toda
                        caja que desborde.
                    </li>
                    <li>
                        Esta página ya las lleva: el lateral y el contenido usan la misma barra.
                    </li>
                </ul>
            </DocSection>

            <DocSection heading="Reglas">
                <ul className="flex list-disc flex-col gap-gap-tight pl-4 text-sm text-text-secondary">
                    <li>
                        La altura se pide con la utilidad del escalón, no con una clase
                        <code className="font-mono text-xs"> h-7</code> encima: un escalón nuevo es
                        un token, no una excepción.
                    </li>
                    <li>
                        Un control no elige su ancho: ocupa todo el que le den, y quien lo coloca
                        decide con la rejilla.
                    </li>
                </ul>
            </DocSection>
        </DocPage>
    );
}

import ordenFocoCode from './orden-foco.tsx?raw';
import { OrdenFocoDemo } from './orden-foco.js';
import { DocPage } from '../../pieces/doc-page.js';
import { DocSection } from '../../pieces/doc-section.js';
import { Demo } from '../../pieces/demo.js';

export function FocoPage() {
    return (
        <DocPage
            lead="El foco es el único lugar donde el acento dice «estoy aquí y te está pasando algo».
                No es un contorno añadido: es el borde que el control ya tenía, pintado del color
                del acento. Nada se mueve, nada crece, nada se dibuja dos veces."
            title="Foco"
        >
            <Demo
                code={ordenFocoCode}
                heading="Recorre los controles con Tab"
                intent="El anillo salta de control en control por el orden del documento: el mismo orden que leería un lector de pantalla."
            >
                <OrdenFocoDemo />
            </Demo>

            <DocSection
                heading="Los dos mecanismos, escritos una vez"
                intent="Viven en runtime.css; ningún componente reescribe su foco."
            >
                <ul className="flex flex-col gap-gap-control text-sm">
                    <li className="flex gap-gap-control">
                        <code className="w-44 shrink-0 font-mono text-xs">data-focus-frame</code>
                        <span className="text-text-secondary">
                            el control con borde cambia el borde de color: Button, Select, Switch,
                            el marco del diálogo. La línea ocupa el mismo píxel que ocupaba.
                        </span>
                    </li>
                    <li className="flex gap-gap-control">
                        <code className="w-44 shrink-0 font-mono text-xs">split-handle</code>
                        <span className="text-text-secondary">
                            un asa no tiene caja: el foco recolorea la línea que ya pinta, la del
                            split y la del lateral. Nada se dibuja por fuera de una caja.
                        </span>
                    </li>
                </ul>
            </DocSection>

            <DocSection
                heading="El anillo"
                intent="--focus-ring es el acento de marca; --focus-ring-width es un píxel."
            >
                <div className="flex items-center gap-gap-group">
                    <span
                        aria-hidden="true"
                        className="flex h-control w-24 items-center justify-center rounded-md border bg-surface-card"
                        style={{ borderColor: 'var(--focus-ring)' }}
                    >
                        <code className="font-mono text-2xs text-text-secondary">frame</code>
                    </span>
                    <span className="text-xs text-text-secondary">
                        la muestra no está enfocada: el color es el mismo, el estado lo pone el
                        navegador
                    </span>
                </div>
            </DocSection>

            <DocSection heading="Reglas">
                <ul className="flex list-disc flex-col gap-gap-tight pl-4 text-sm text-text-secondary">
                    <li>
                        El anillo entra por <code className="font-mono text-xs">focus-visible</code>
                        : el puntero no lo enciende. Quien navega con teclado lo ve; quien apunta no
                        necesita verlo.
                    </li>
                    <li>
                        Un control deshabilitado no recibe foco; un{' '}
                        <code className="font-mono text-xs">outline-none</code>
                        sin relevo no pasa la comprobación de diseño.
                    </li>
                    <li>
                        El acento vive en foco, acción primaria, lo encendido y la marca de la app,
                        y en ningún otro sitio; seleccionado y activo son gris: un texto en acento
                        que no es ni enlace ni acción es un segundo foco mentiroso.
                    </li>
                </ul>
            </DocSection>
        </DocPage>
    );
}

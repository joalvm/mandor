import { DocPage } from '../../pieces/doc-page.js';
import { DocSection } from '../../pieces/doc-section.js';

const CROMO: readonly { block: string; assembly: string }[] = [
    {
        assembly: 'El marco de la ventana: la rejilla que sostiene título, lateral, área y estado.',
        block: 'AppShell',
    },
    {
        assembly: 'El área de pestañas: la rejilla de dockview y lo que la llena.',
        block: 'Workbench',
    },
    {
        assembly: 'La barra de título: ventanas, título del documento y acciones de la app.',
        block: 'TitleBar',
    },
    {
        assembly: 'El cuerpo entre título y estado: el hueco que el contenido llena.',
        block: 'AppBody',
    },
    {
        assembly: 'El lateral: secciones registradas por cada app, plegables.',
        block: 'SidePanel',
    },
    {
        assembly: 'La barra de estado: lo que la app cuenta de sí misma, en una línea.',
        block: 'StatusBar',
    },
    {
        assembly: 'Los botones de ventana, dibujados y no del cromo del sistema.',
        block: 'WindowButton',
    },
];

const FEATURE: readonly { block: string; assembly: string }[] = [
    {
        assembly: 'El documento en lectura: markdown compuesto con anclas y líneas.',
        block: 'DocView (@mandor/docs)',
    },
    {
        assembly: 'El documento en edición: la misma página escrita por detrás.',
        block: 'DocWrite (@mandor/docs)',
    },
];

function Term({ children }: { children: string }) {
    return <code className="font-mono text-xs">{children}</code>;
}

function BlockList({ entries }: { entries: readonly { block: string; assembly: string }[] }) {
    return (
        <dl className="flex flex-col gap-gap-control">
            {entries.map((entry) => (
                <div className="flex flex-col gap-1" key={entry.block}>
                    <dt className="text-sm font-medium">
                        <Term>{entry.block}</Term>
                    </dt>
                    <dd className="text-sm text-text-secondary">{entry.assembly}</dd>
                </div>
            ))}
        </dl>
    );
}

/**
 * La puerta de la sección: qué es un bloque, qué bloques se documentarán y por qué su página
 * no se parece a la de un componente. Llega con el plan de bloques; hasta entonces, esto es
 * el índice acordado.
 */
export function BlocksOverviewPage() {
    return (
        <DocPage
            lead="Composiciones que arman la ventana: cada una junta varios componentes y cada app la llena a su manera."
            title="Bloques"
        >
            <DocSection heading="Qué es un bloque">
                <p className="text-sm text-text-secondary">
                    Un bloque no se documenta por props ni por estados: se documenta por ensamblaje.
                    Qué entra en él, qué huecos deja y qué rellena cada app — Mandor Realtime y
                    Mandor Request montan el mismo cromo con registros distintos, y cada diferencia
                    lleva escrito su motivo.
                </p>
            </DocSection>
            <DocSection
                heading="Los bloques del cromo"
                intent="Viven en @mandor/ui, y las apps los componen en su arranque."
            >
                <BlockList entries={CROMO} />
            </DocSection>
            <DocSection
                heading="Los bloques de feature"
                intent="Piezas grandes que una feature monta; el lab las muestra con sus dobles."
            >
                <BlockList entries={FEATURE} />
            </DocSection>
            <DocSection heading="Ensamblaje">
                <p className="text-sm text-text-secondary">
                    La última página de la sección monta la ventana completa: Async y Sync lado a
                    lado, cada una con su título, sus secciones y sus pestañas. Ahí se ve el bloque
                    haciendo lo suyo: sostener, no decidir.
                </p>
            </DocSection>
        </DocPage>
    );
}

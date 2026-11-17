import { Badge, Button, StatusDot } from '@mandor/ui';

function Muestra({ theme }: { theme: 'dark' | 'light' }) {
    return (
        <div
            className="flex flex-1 flex-col gap-gap-control rounded-md border border-border-subtle bg-surface-app p-pad-panel"
            data-theme={theme}
        >
            <div className="flex items-center gap-gap-control">
                <StatusDot label="Conectado" state="connected" />
                <span className="text-sm text-text-primary">mandor-sync.local</span>
                <Badge tone="accent">Acento</Badge>
                <Badge tone="warning">Aviso</Badge>
            </div>
            <div className="rounded-md border border-border-subtle bg-surface-panel p-pad-panel">
                <p className="text-2xs text-text-secondary">bg-surface-panel</p>
                <div className="mt-1 flex h-field items-center rounded-md border border-border-subtle bg-surface-sunken px-pad-control">
                    <p className="text-2xs text-text-secondary">bg-surface-sunken</p>
                </div>
            </div>
            <div className="flex gap-gap-control">
                <Button variant="primary">Guardar</Button>
                <Button variant="secondary">Cancelar</Button>
            </div>
        </div>
    );
}

/** El mismo contenido dibujado dos veces, cada una forzada a un tema: nada de capturas. */
export function DosTemasDemo() {
    return (
        <div className="flex flex-col gap-gap-group lg:flex-row">
            <Muestra theme="light" />
            <Muestra theme="dark" />
        </div>
    );
}

import { Button, ToastProvider, useToast } from '@mandor/ui';

const TONOS = [
    { titulo: 'Workspace creado', tono: 'success' },
    { titulo: 'Huellas copiadas', tono: 'info' },
    { titulo: 'El server no respondió', tono: 'warning' },
    { titulo: 'La conexión se cayó', tono: 'error' },
] as const;

function Botones() {
    const { notify } = useToast();

    return (
        <div className="flex flex-wrap gap-gap-control">
            {TONOS.map(({ titulo, tono }) => (
                <Button
                    key={tono}
                    onClick={() => {
                        notify({ detail: `tono: ${tono}`, title: titulo, tone: tono });
                    }}
                    variant="secondary"
                >
                    {tono}
                </Button>
            ))}
            <Button
                onClick={() => {
                    notify({
                        detail: 'La conexión llevaba 30 segundos esperando respuesta del servidor y el tiempo de espera se agotó.',
                        title: 'No se pudo guardar la configuración del transporte porque el servidor no respondió dentro del tiempo de espera',
                        tone: 'warning',
                    });
                }}
                variant="secondary"
            >
                largo
            </Button>
            <Button
                onClick={() => {
                    for (const { titulo, tono } of TONOS) {
                        notify({ title: titulo, tone: tono });
                    }
                }}
                variant="secondary"
            >
                los cuatro juntos
            </Button>
        </div>
    );
}

/** Los cuatro tonos. Icono, primera línea y cierre en una lectura; el hover para el conteo. */
export function TonosDemo() {
    return (
        <ToastProvider messages={{ close: 'Cerrar', more: (n) => `${String(n)} más` }}>
            <Botones />
        </ToastProvider>
    );
}

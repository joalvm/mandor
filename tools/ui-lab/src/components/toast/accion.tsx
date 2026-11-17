import { Button, ToastProvider, useToast } from '@mandor/ui';

function Boton() {
    const { notify } = useToast();

    function borra(): void {
        notify({
            action: {
                label: 'Deshacer',
                onSelect: () => {
                    notify({
                        detail: 'El workspace volvió.',
                        title: 'Recuperado',
                        tone: 'success',
                    });
                },
            },
            detail: 'Gateway local se fue a la papelera del origen.',
            title: 'Workspace borrado',
            tone: 'info',
        });
    }

    return (
        <Button onClick={borra} variant="secondary">
            borrar un workspace
        </Button>
    );
}

/** La acción dentro del toast: el aviso ofrece la vuelta atrás en el sitio. */
export function AccionDemo() {
    return (
        <ToastProvider messages={{ close: 'Cerrar', more: (n) => `${String(n)} más` }}>
            <Boton />
        </ToastProvider>
    );
}

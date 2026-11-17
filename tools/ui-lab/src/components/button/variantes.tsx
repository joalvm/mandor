import { Button } from '@mandor/ui';

/** Las seis variantes, cada una en el sitio que le toca. */
export function VariantesDemo() {
    return (
        <>
            <Button variant="primary">Guardar</Button>
            <Button variant="secondary">Duplicar</Button>
            <Button variant="danger">Eliminar</Button>
            <Button variant="ghost">Cancelar</Button>
            <Button variant="chrome">Del cromo</Button>
            <Button size="sm" variant="link">
                Reintentar
            </Button>
        </>
    );
}

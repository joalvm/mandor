import { Button } from '@mandor/ui';

/** Las dos alturas de la escala: la de banda y la que cabe dentro de una fila. */
export function TamanosDemo() {
    return (
        <>
            <Button size="sm">Secundario pequeño</Button>
            <Button>Secundario normal</Button>
            <Button size="sm" variant="primary">
                Primario pequeño
            </Button>
            <Button variant="primary">Primario normal</Button>
        </>
    );
}

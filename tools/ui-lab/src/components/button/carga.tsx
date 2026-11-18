import { Button } from '@mandor/ui';

/**
 * El spinner cae encima del contenido: el botón no crece ni mueve la fila. Y el rótulo se
 * vuelve transparente, no invisible: para el lector de pantalla el botón sigue llamándose
 * igual mientras corre.
 */
export function CargaDemo() {
    return (
        <>
            <Button variant="primary">Guardar</Button>
            <Button loading variant="primary">
                Guardar
            </Button>
            <Button loading variant="secondary">
                Comprobando el servidor
            </Button>
        </>
    );
}

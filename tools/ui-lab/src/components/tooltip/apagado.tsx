import { Button } from '@mandor/ui';

/**
 * El motivo vive en el botón: apagado sigue donde estaba —la fila no se mueve— y dice por qué
 * al pasar el puntero. Sin motivo no hay tooltip y el botón queda solo.
 */
export function ApagadoDemo() {
    return (
        <div className="flex items-center gap-gap-section">
            <Button>Publicar</Button>
            <Button disabled disabledReason="Conecta un origen primero">
                Publicar
            </Button>
        </div>
    );
}

import { Button } from '@mandor/ui';

/**
 * Reposo y los dos apagados. El hover y el foco no se pintan a mano: recorren de verdad — apunta
 * con el ratón y salta con Tab, y el anillo que verás es el de runtime.css, no un truco de la
 * demo.
 */
export function EstadosDemo() {
    return (
        <>
            <Button>Reposo</Button>
            <Button disabled>Deshabilitado</Button>
            <Button disabled disabledReason="Elige antes una conexión">
                Deshabilitado con motivo
            </Button>
        </>
    );
}

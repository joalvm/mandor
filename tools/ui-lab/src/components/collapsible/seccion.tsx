import {
    Collapsible,
    CollapsibleBody,
    CollapsibleHeader,
    IconButton,
    ListRow,
    RowLabel,
} from '@mandor/ui';
import { useState } from 'react';

const CONEXIONES = ['gateway-local', 'gateway-staging', 'cola-muerta'];

/**
 * La sección que se pliega en su cabecera: la cabecera se queda — una sección que desaparece
 * no se puede traer de vuelta — y lo que aplica a la región entera va fuera del trigger, en
 * botones de icono que la cabecera pega contra el borde final.
 */
export function SeccionDemo() {
    const [abierta, setAbierta] = useState(true);
    const [tomada, setTomada] = useState('gateway-local');

    return (
        <div className="flex h-60 flex-col border border-border-subtle">
            <Collapsible onOpenChange={setAbierta} open={abierta}>
                <CollapsibleHeader count={CONEXIONES.length} title="Conexiones">
                    <IconButton icon="add" label="Nueva conexión" />
                    <IconButton icon="import" label="Importar conexiones" />
                </CollapsibleHeader>
                <CollapsibleBody>
                    <div aria-label="Conexiones" className="flex flex-col py-1" role="listbox">
                        {CONEXIONES.map((conexion) => (
                            <ListRow
                                key={conexion}
                                onSelect={() => {
                                    setTomada(conexion);
                                }}
                                selected={conexion === tomada}
                            >
                                <RowLabel>{conexion}</RowLabel>
                            </ListRow>
                        ))}
                    </div>
                </CollapsibleBody>
            </Collapsible>
        </div>
    );
}

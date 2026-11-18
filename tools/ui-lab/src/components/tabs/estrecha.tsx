import { Button, Tabs, TabsList, TabsPanel, TabsStrip, TabsTab } from '@mandor/ui';
import { useState } from 'react';

const SECCIONES = [
    { label: 'Parámetros', value: 'params' },
    { count: 3, label: 'Cabeceras', value: 'cabeceras' },
    { dirty: true, label: 'Cuerpo', value: 'cuerpo' },
    { label: 'Autorización', value: 'auth' },
    { label: 'Scripts', value: 'scripts' },
    { label: 'Ajustes', value: 'ajustes' },
] as const;

/**
 * Una tira más estrecha que sus secciones: las que no caben siguen en la lista, cortadas en el
 * borde, y el menú al final de la lista (TabsOverflow) las ofrece. La abierta siempre se ve.
 */
export function EstrechaDemo() {
    const [seccion, setSeccion] = useState('params');

    return (
        <Tabs onValueChange={setSeccion} value={seccion}>
            <div className="max-w-sm border border-border-subtle">
                <TabsStrip>
                    <TabsList label="Secciones del request">
                        {SECCIONES.map((each) => (
                            <TabsTab key={each.value} {...each} />
                        ))}
                    </TabsList>
                    <Button variant="primary">Enviar</Button>
                </TabsStrip>
                {SECCIONES.map((each) => (
                    <TabsPanel key={each.value} value={each.value}>
                        <p className="p-pad-panel text-sm text-text-secondary">
                            {each.label}: abierta desde la tira o desde su menú.
                        </p>
                    </TabsPanel>
                ))}
            </div>
        </Tabs>
    );
}

import { Button, Tabs, TabsList, TabsPanel, TabsStrip, TabsTab } from '@mandor/ui';
import { useState } from 'react';

/**
 * La tira de secciones de un panel: la pestaña no pinta nada propio, lo tienen sus estados;
 * la ranura final está siempre y lo que aplica al panel entero va fuera de la lista.
 */
export function SeccionesDemo() {
    const [seccion, setSeccion] = useState('cuerpo');

    return (
        <Tabs onValueChange={setSeccion} value={seccion}>
            <div className="border border-border-subtle">
                <TabsStrip>
                    <TabsList label="Secciones del request">
                        <TabsTab label="Parámetros" value="params" />
                        <TabsTab count={3} label="Cabeceras" value="cabeceras" />
                        <TabsTab dirty label="Cuerpo" value="cuerpo" />
                        <TabsTab filled label="Esquema" value="esquema" />
                    </TabsList>
                    <Button variant="primary">Enviar</Button>
                </TabsStrip>
                <TabsPanel value="params">
                    <p className="p-pad-panel text-sm text-text-secondary">
                        query, path y variables, una línea por campo.
                    </p>
                </TabsPanel>
                <TabsPanel value="cabeceras">
                    <p className="p-pad-panel text-sm text-text-secondary">
                        Tres cabeceras: content-type, accept y x-traza.
                    </p>
                </TabsPanel>
                <TabsPanel value="cuerpo">
                    <p className="p-pad-panel text-sm text-text-secondary">
                        El cuerpo tiene cambios sin enviar: el punto azul de la ranura lo dice sin
                        abrir.
                    </p>
                </TabsPanel>
                <TabsPanel value="esquema">
                    <p className="p-pad-panel text-sm text-text-secondary">
                        Hay esquema, pero nada que contar: el punto callado de la ranura.
                    </p>
                </TabsPanel>
            </div>
        </Tabs>
    );
}

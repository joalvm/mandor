import { Field, Input, Tabs, TabsList, TabsPanel, TabsStrip, TabsTab } from '@mandor/ui';
import { useState } from 'react';

/**
 * La sección montada no se desmonta: lo que se escribió en ella sigue cuando otra abre.
 * Una que nunca abrió no se dibuja — un editor que nadie mira no se construye.
 */
export function MontajeDemo() {
    const [seccion, setSeccion] = useState('editor');
    const [nombre, setNombre] = useState('');

    return (
        <Tabs onValueChange={setSeccion} value={seccion}>
            <div className="border border-border-subtle">
                <TabsStrip>
                    <TabsList label="Secciones">
                        <TabsTab label="Editor" value="editor" />
                        <TabsTab label="Otra cosa" value="otra" />
                    </TabsList>
                </TabsStrip>
                <TabsPanel value="editor">
                    <div className="p-pad-panel">
                        <Field id="lab-montaje-nombre" label="Nombre del evento">
                            <Input
                                label="Nombre del evento"
                                onValueChange={setNombre}
                                value={nombre}
                            />
                        </Field>
                    </div>
                </TabsPanel>
                <TabsPanel value="otra">
                    <p className="p-pad-panel text-sm text-text-secondary">
                        Sección de relleno. Cambia aquí y vuelve: el campo de la otra se conserva.
                    </p>
                </TabsPanel>
            </div>
        </Tabs>
    );
}

import { Tabs, TabsList, TabsPanel, TabsTab } from '@mandor/ui';
import { useState } from 'react';

const MOMENTOS = [
    { value: 'antes', label: 'Antes de conectar', filled: true, muted: false },
    { value: 'al-conectar', label: 'Al conectar', filled: false, muted: false },
    { value: 'mensajes', label: 'Con los mensajes', filled: true, muted: true },
] as const;

/**
 * Las secciones en columna, al lado de su panel: los momentos de un script. La columna mide el
 * nombre más largo, en una línea; el punto dice que hay código y el nombre apagado, que está
 * desactivado. Las flechas arriba y abajo la recorren.
 */
export function ColumnaDemo() {
    const [momento, setMomento] = useState('antes');

    return (
        <div className="h-40 border border-border-subtle p-pad-panel">
            <Tabs onValueChange={setMomento} orientation="vertical" value={momento}>
                <TabsList label="Momentos de la conexión">
                    {MOMENTOS.map((each) => (
                        <TabsTab
                            filled={each.filled}
                            key={each.value}
                            label={each.label}
                            muted={each.muted}
                            value={each.value}
                        />
                    ))}
                </TabsList>
                {MOMENTOS.map((each) => (
                    <TabsPanel key={each.value} value={each.value}>
                        <p className="text-sm text-text-secondary">El script de «{each.label}».</p>
                    </TabsPanel>
                ))}
            </Tabs>
        </div>
    );
}

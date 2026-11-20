import { Button, HoverCard, HoverCardPanel, HoverCardTrigger } from '@mandor/ui';

const FASES = [
    { name: 'DNS', time: '4 ms' },
    { name: 'Conexión', time: '18 ms' },
    { name: 'TLS', time: '31 ms' },
    { name: 'Espera', time: '62 ms' },
    { name: 'Descarga', time: '5 ms' },
] as const;

/**
 * Una cifra del resumen de la respuesta que se explica sola: posarse en ella abre el desglose,
 * salir lo cierra. Pasar por encima camino de otra cosa no abre nada, y no toma el foco.
 */
export function DesgloseDemo() {
    return (
        <HoverCard>
            <HoverCardTrigger>
                <Button
                    className="h-control-xs shrink-0 cursor-default px-1 tabular-nums text-text-secondary enabled:hover:text-text-primary"
                    size="sm"
                    variant="ghost"
                >
                    120 ms
                </Button>
            </HoverCardTrigger>
            <HoverCardPanel>
                <dl className="grid grid-cols-[auto_auto] gap-x-6 gap-y-1 text-xs">
                    {FASES.map((fase) => (
                        <div className="contents" key={fase.name}>
                            <dt className="text-text-secondary">{fase.name}</dt>
                            <dd className="text-right tabular-nums">{fase.time}</dd>
                        </div>
                    ))}
                </dl>
            </HoverCardPanel>
        </HoverCard>
    );
}

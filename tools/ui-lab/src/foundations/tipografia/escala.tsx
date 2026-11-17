/** La escala de letra, cada paso con el trabajo que le toca. */
export function EscalaDemo() {
    return (
        <div className="flex flex-col gap-gap-control">
            {[
                {
                    cls: 'text-xl',
                    name: 'text-xl',
                    sample: 'Mandor Request',
                    use: 'el título de una página',
                },
                {
                    cls: 'text-lg',
                    name: 'text-lg',
                    sample: 'Conexiones',
                    use: 'el título de una sección',
                },
                {
                    cls: 'text-md',
                    name: 'text-md',
                    sample: 'El texto que se lee primero',
                    use: 'la voz de la interfaz',
                },
                {
                    cls: 'text-sm',
                    name: 'text-sm',
                    sample: 'El texto de apoyo y el de los controles',
                    use: 'labels, celdas, ayuda',
                },
                {
                    cls: 'text-xs',
                    name: 'text-xs',
                    sample: 'La nota y el mensaje de campo',
                    use: 'ayudas y errores',
                },
                {
                    cls: 'text-2xs',
                    name: 'text-2xs',
                    sample: 'El microtexto y la señal',
                    use: 'badge, contador, pie',
                },
                {
                    cls: 'font-mono text-code',
                    name: 'text-code',
                    sample: 'const puerto = 8080;',
                    use: 'el código, con su fuente',
                },
            ].map((step) => (
                <div className="flex items-baseline gap-gap-group" key={step.name}>
                    <code className="w-28 shrink-0 font-mono text-2xs text-text-secondary">
                        {step.name}
                    </code>
                    <span className={`${step.cls} w-72 shrink-0 text-text-primary`}>
                        {step.sample}
                    </span>
                    <span className="text-xs text-text-secondary">{step.use}</span>
                </div>
            ))}
        </div>
    );
}

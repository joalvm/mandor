import { createHighlighter, type Highlighter } from 'shiki';
import { createJavaScriptRegexEngine } from 'shiki/engine/javascript';
import { useEffect, useState } from 'react';

import { CODE_THEME } from './code-theme.js';

let shared: Promise<Highlighter> | undefined;

function sharedHighlighter(): Promise<Highlighter> {
    // Un solo resaltador para todo el lab: la gramática de tsx y css pesa, y ninguna página
    // necesita uno propio. El motor es el de JavaScript, sin WASM.
    shared ??= createHighlighter({
        engine: createJavaScriptRegexEngine({ forgiving: true }),
        langs: ['css', 'tsx'],
        themes: [CODE_THEME],
    });

    return shared;
}

/** Suelto lleva su propio marco; dentro de una demo, el marco es el de la tarjeta. */
type CodeFrame = 'bare' | 'card';

const FRAME_CLASSES: Record<CodeFrame, string> = {
    bare: 'p-5',
    card: 'rounded-lg border border-border-subtle p-4',
};

type CodeBlockProps = {
    code: string;
    frame?: CodeFrame;
    lang?: 'css' | 'tsx';
};

/**
 * El código de una demo, tal cual vive en su archivo, resaltado con la paleta del editor.
 * Mientras el resaltador carga, el código se lee sin color: nada de espacios vacíos.
 */
export function CodeBlock({ code, frame = 'card', lang = 'tsx' }: CodeBlockProps) {
    const [html, setHtml] = useState('');

    useEffect(() => {
        let alive = true;

        sharedHighlighter()
            .then((it) => {
                if (alive) {
                    setHtml(it.codeToHtml(code, { lang, theme: 'mandor-lab' }));
                }
            })
            .catch(() => {
                // Sin resaltador el bloque queda en su texto plano: nada que reportar aquí.
            });

        return () => {
            alive = false;
        };
    }, [code, lang]);

    const classes = `overflow-x-auto bg-surface-sunken font-mono text-code leading-relaxed ${FRAME_CLASSES[frame]}`;

    if (html === '') {
        return (
            <pre className={classes}>
                <code>{code}</code>
            </pre>
        );
    }

    return <div className={classes} dangerouslySetInnerHTML={{ __html: html }} />;
}

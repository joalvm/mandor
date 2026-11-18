import { DocPage } from '../../pieces/doc-page.js';
import { Demo } from '../../pieces/demo.js';
import editorCode from './editor.tsx?raw';
import { AuthEditorDemo } from './editor.js';

/** El bloque de auth: el editor que comparten las dos apps, a la manera de Postman. */
export function AuthPage() {
    return (
        <DocPage
            lead="Un editor para la auth de cualquier nivel: el tipo, lo que hace en una línea y los campos que pide, con lo que pocos tocan plegado bajo «Advanced»."
            title="Auth"
        >
            <Demo
                code={editorCode}
                heading="El editor"
                intent="Cambia el tipo: la columna se queda y cambian las filas."
            >
                <AuthEditorDemo />
            </Demo>
        </DocPage>
    );
}

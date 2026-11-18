import { AuthEditor } from '@mandor/env';
import { MessagesProvider } from '@mandor/i18n';
import type { AuthConfig } from '@mandor/schema';
import { ToastProvider } from '@mandor/ui';
import { useState, type ReactNode } from 'react';

/**
 * El editor de auth de una petición, tal como lo pinta la pestaña: el tipo arriba, lo que hace
 * debajo y los campos de ese tipo en filas de etiqueta y control.
 */
export function AuthEditorDemo(): ReactNode {
    const [auth, setAuth] = useState<AuthConfig | undefined>({
        type: 'bearer',
        token: '{{api_token}}',
    });

    return (
        <MessagesProvider preferences={{ language: 'en' }}>
            <ToastProvider messages={{ close: 'Close', more: (count) => String(count) }}>
                <div
                    className="flex flex-col px-pad-panel pt-gap-group pb-pad-control"
                    data-part="lab-auth-demo"
                >
                    <AuthEditor
                        environment={undefined}
                        environmentId={null}
                        inheritable
                        inheritedLabel="Uses Bearer from Personal."
                        onChange={setAuth}
                        onVariablesChange={() => undefined}
                        parentPath={null}
                        placements={['header', 'query', 'cookie']}
                        value={auth}
                    />
                </div>
            </ToastProvider>
        </MessagesProvider>
    );
}

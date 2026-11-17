import { dirname, isAbsolute, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import type { CustomScheme } from 'electron';

export const RENDERER_SCHEME = 'mandor';

const RENDERER_ORIGIN = `${RENDERER_SCHEME}://app`;

type SchemeTarget = {
    registerSchemesAsPrivileged: (schemes: CustomScheme[]) => void;
};

export type RendererProtocol = {
    entryUrl: string;
    fileUrl?: (requestUrl: string) => string | null;
};

export function registerRendererScheme(target: SchemeTarget): void {
    target.registerSchemesAsPrivileged([
        {
            scheme: RENDERER_SCHEME,
            privileges: {
                codeCache: true,
                secure: true,
                standard: true,
                supportFetchAPI: true,
            },
        },
    ]);
}

export function createRendererProtocol(entryUrl: string): RendererProtocol {
    const entry = new URL(entryUrl);

    if (entry.protocol !== 'file:') {
        return { entryUrl };
    }

    const root = dirname(fileURLToPath(entry));
    const entryName = entry.pathname.split('/').at(-1) ?? 'index.html';

    return {
        entryUrl: `${RENDERER_ORIGIN}/${entryName}`,
        fileUrl: (requestUrl) => resolveRequest(root, requestUrl),
    };
}

function resolveRequest(root: string, requestUrl: string): string | null {
    if (!URL.canParse(requestUrl) || !requestUrl.startsWith(`${RENDERER_ORIGIN}/`)) {
        return null;
    }

    const rawPath = requestUrl.slice(`${RENDERER_ORIGIN}/`.length).split(/[?#]/)[0] ?? '';
    const request = new URL(requestUrl);
    const decoded = decodePath(request.pathname);
    const decodedRaw = decodePath(rawPath);

    if (
        request.hostname !== 'app' ||
        decoded === null ||
        decodedRaw === null ||
        decodedRaw.split('/').includes('..')
    ) {
        return null;
    }

    const path = resolve(root, `.${decoded}`);
    const fromRoot = relative(root, path);

    if (fromRoot.startsWith('..') || isAbsolute(fromRoot)) {
        return null;
    }

    return pathToFileURL(path).toString();
}

function decodePath(path: string): string | null {
    try {
        return decodeURIComponent(path);
    } catch {
        return null;
    }
}

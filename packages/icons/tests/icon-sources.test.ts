import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const manifestPath = join(packageRoot, 'icon-sources.json');

type CodiconSource = { origin: 'codicons'; id: string; sha256: string; license: string };
type OwnSource = {
    origin: 'own' | 'derived';
    file: string;
    base?: string | undefined;
    sha256: string;
    license: string;
};
type Source = CodiconSource | OwnSource;
type Intention = { state: 'candidate' | 'approved'; mirrored?: true; source: Source };
type Manifest = {
    provider: { package: string; version: string };
    intentions: Record<string, Intention>;
};

async function sha256Of(path: string) {
    return createHash('sha256')
        .update(await readFile(path, 'utf8'))
        .digest('hex');
}

function pathOf(source: Source): string {
    if (source.origin === 'codicons') {
        return join(
            packageRoot,
            '../../node_modules/@vscode/codicons/src/icons',
            `${source.id}.svg`,
        );
    }

    return join(packageRoot, source.file);
}

/** The one structural promise the source owes the frame: a 16 grid drawn with paths, nothing live. */
function assertDrawable(svg: string, label: string) {
    expect(svg, `${label}: viewBox`).toContain('viewBox="0 0 16 16"');
    expect(svg, `${label}: un path`).toContain('<path');
    expect(svg, `${label}: contenido activo`).not.toMatch(
        /<(script|image|use|style|foreignObject)\b/,
    );
}

async function readManifest(): Promise<Manifest> {
    return JSON.parse(await readFile(manifestPath, 'utf8')) as Manifest;
}

describe('the icon-sources manifest', () => {
    it('covers exactly the intentions the current registry draws', async () => {
        const { intentions } = await readManifest();
        const { ICON_NAMES } = await import('../src/icon-name.js');

        expect(Object.keys(intentions).sort()).toEqual([...ICON_NAMES].sort());
    });

    it('cites one drawable source per intention, with the hash of what it cites', async () => {
        const { intentions } = await readManifest();

        for (const [name, { source }] of Object.entries(intentions)) {
            const path = pathOf(source);

            expect(await sha256Of(path), `${name}: sha256`).toBe(source.sha256);
            assertDrawable(await readFile(path, 'utf8'), name);
        }
    });

    it('keeps foreign sources inside the pinned provider and own ones inside authoring/', async () => {
        const manifest = await readManifest();

        expect(manifest.provider).toEqual({ package: '@vscode/codicons', version: '0.0.46-24' });

        const provider = JSON.parse(
            await readFile(
                join(packageRoot, '../../node_modules/@vscode/codicons/package.json'),
                'utf8',
            ),
        ) as { version: string };

        expect(provider.version, 'proveedor instalado').toBe(manifest.provider.version);

        for (const [name, { source }] of Object.entries(manifest.intentions)) {
            if (source.origin === 'codicons') {
                expect(source.id, `${name}: id`).toMatch(/^[a-z0-9-]+$/);
                continue;
            }

            expect(source.file, `${name}: confinada a authoring/`).toMatch(
                /^authoring\/[a-z0-9-]+\.svg$/,
            );

            if (source.origin === 'derived') {
                expect(source.base, `${name}: base de la derivada`).toMatch(
                    /^codicons:[a-z0-9-]+$/,
                );
            }
        }
    });

    it('declares registry state as one voice: everything candidate or everything approved', async () => {
        const { intentions } = await readManifest();
        const states = [...new Set(Object.values(intentions).map((each) => each.state))];

        expect(states).toHaveLength(1);
        expect(['candidate', 'approved']).toContain(states[0]);
    });

    /** What the NOTICE distributes as attribution is what the manifest cites: one story, two files. */
    it('keeps the manifest provenance honest with the NOTICE attribution', async () => {
        const manifest = await readManifest();
        const notice = await readFile(join(packageRoot, 'NOTICE.md'), 'utf8');
        const rows = [
            ...notice.matchAll(/^\|\s*`([a-z-]+)`\s*\|\s*(propia|derivada de `[a-z0-9-]+`)\s*\|/gm),
        ].flatMap((match) => {
            const name = match[1];
            const origin = match[2];

            return name !== undefined && origin !== undefined ? [{ name, origin }] : [];
        });
        const nonCodicons = Object.entries(manifest.intentions)
            .filter(([, { source }]) => source.origin !== 'codicons')
            .map(([name, { source }]) => ({ name, source }));

        expect(rows.map(({ name }) => name).sort()).toEqual(
            nonCodicons.map(({ name }) => name).sort(),
        );

        for (const { name, origin } of rows) {
            const source = nonCodicons.find((each) => each.name === name)?.source;

            if (source === undefined) {
                throw new Error(`${name}: el NOTICE lo atribuye y el manifiesto no lo cita`);
            }

            expect(source.origin, `${name}: origen`).not.toBe('codicons');

            if (source.origin === 'codicons') {
                throw new Error(
                    `${name}: el NOTICE declara fuente propia y el manifiesto cita codicons`,
                );
            }

            if (origin === 'propia') {
                expect(source.origin, `${name}: origen`).toBe('own');
                continue;
            }

            const base = origin.replace('derivada de `', 'codicons:').replaceAll('`', '');

            expect(source.origin, `${name}: origen`).toBe('derived');
            expect(source.base, `${name}: base`).toBe(base);
        }
    });
});

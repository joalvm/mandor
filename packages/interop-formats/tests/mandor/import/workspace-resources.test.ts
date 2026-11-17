import { degradation, environmentFingerprint, fingerprintOf } from '@mandor/interop-core';
import { describe, expect, it } from 'vitest';

import { parseMandorDocument } from '../../../src/mandor/document/parse-mandor-document.js';
import { workspaceResourcesOf } from '../../../src/mandor/import/workspace-resources.js';
import { fixtureText } from '../support/sample-workspace.js';

function resourcesOf(fixture: string, app: 'sync' | 'async') {
    return workspaceResourcesOf(parseMandorDocument(fixtureText(fixture), app), 'Tienda');
}

describe('workspaceResourcesOf', () => {
    it('lists the workspace file, the environments, and the notes, in that order', () => {
        const resources = resourcesOf('sync-workspace.mandor.yaml', 'sync');

        expect(resources.map(({ place, route }) => [place, route])).toEqual([
            ['workspace', '.'],
            ['environment', 'base'],
            ['environment', 'prod'],
            ['doc', 'leeme.md'],
        ]);
    });

    it('carries the auth of the workspace in the fields of its file, and no variables', () => {
        const [workspace] = resourcesOf('sync-workspace.mandor.yaml', 'sync');

        expect(workspace?.fields).toEqual({ auth: { type: 'bearer', token: '{{token}}' } });
        expect(workspace?.origin.kind).toBe('mandor');
    });

    it('spreads the variables an older bundle kept on its workspace into its environments', () => {
        const [, base, prod] = resourcesOf('sync-workspace.mandor.yaml', 'sync');
        const region = { name: 'region', value: 'eu', enabled: true, secret: false };

        expect(base).toMatchObject({ name: 'Base', fields: { variables: [region] } });
        expect(prod?.fields['variables']).toContainEqual(region);
    });

    it('writes no resource for a workspace that says nothing about its own file', () => {
        const resources = resourcesOf('async-workspace.mandor.yaml', 'async');

        expect(resources.some((resource) => resource.place === 'workspace')).toBe(false);
    });

    it('brings an environment with its names and tells that a secret enters empty', () => {
        const environment = resourcesOf('sync-workspace.mandor.yaml', 'sync')[2];

        expect(environment?.name).toBe('Prod');
        expect(environment?.fields['variables']).toEqual([
            { name: 'baseUrl', value: 'https://api.test', enabled: true, secret: false },
            { name: 'token', value: '', enabled: true, secret: true },
            { name: 'region', value: 'eu', enabled: true, secret: false },
        ]);
        expect(environment?.degradations).toEqual([
            degradation('secretEntersEmptyEnvironment', { name: 'token' }),
        ]);
        expect(environment?.origin.fingerprint).toBe(
            environmentFingerprint({
                name: 'Prod',
                variables: [{ name: 'baseUrl' }, { name: 'token' }, { name: 'region' }],
            }),
        );
    });

    it('empties a secret a hand-edited file carried, so no value gets into the repo', () => {
        const text = fixtureText('sync-workspace.mandor.yaml').replace(
            'value: ""\n        enabled: true\n        secret: true',
            'value: hunter2\n        enabled: true\n        secret: true',
        );
        const resources = workspaceResourcesOf(parseMandorDocument(text, 'sync'), 'Tienda');

        expect(JSON.stringify(resources)).not.toContain('hunter2');
    });

    it('brings a connection whole under its id, claimed by this import', () => {
        const [connection] = resourcesOf('async-workspace.mandor.yaml', 'async').filter(
            ({ place }) => place === 'connection',
        );

        expect(connection?.route).toBe('pedidos');
        expect(connection?.fields).toMatchObject({
            id: 'pedidos',
            name: 'Pedidos',
            transport: 'websocket',
            url: 'wss://api.test/ws',
        });
        expect(connection?.fields).not.toHaveProperty('origin');
        expect(connection?.origin.fingerprint).toBe(
            fingerprintOf({
                name: 'Pedidos',
                url: 'wss://api.test/ws',
                transport: 'websocket',
                headers: [],
            }),
        );
    });

    it('brings a note by the title the document gives it, and not by its file', () => {
        const doc = resourcesOf('titled-doc.mandor.yaml', 'sync').at(-1);

        expect(doc).toMatchObject({
            place: 'doc',
            route: 'k3m9x2q7a4bd.md',
            name: 'Guía de uso',
        });
    });

    it('brings a note that names no title by its file, routed by that file, with its text', () => {
        const doc = resourcesOf('sync-workspace.mandor.yaml', 'sync').at(-1);

        expect(doc).toMatchObject({
            place: 'doc',
            route: 'leeme.md',
            name: 'leeme',
            fields: { text: '# Tienda\n\nNotas de la tienda.\n' },
        });
    });

    it('names Base apart when the bundle already has an environment with its id', () => {
        const text = fixtureText('sync-workspace.mandor.yaml').replace('id: prod', 'id: base');
        const resources = workspaceResourcesOf(parseMandorDocument(text, 'sync'), 'Tienda');

        expect(
            resources.filter(({ place }) => place === 'environment').map(({ route }) => route),
        ).toEqual(['base-workspace', 'base']);
    });
});

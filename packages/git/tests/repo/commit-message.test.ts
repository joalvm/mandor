import { describe, expect, it } from 'vitest';

import { commitMessage } from '../../src/repo/commit-message.js';

describe('naming a commit after the change that caused it', () => {
    it('names the birth of a repo', () => {
        expect(commitMessage({ kind: 'init-repo' })).toBe('init repo');
    });

    it('names a repo that carries nothing yet', () => {
        expect(commitMessage({ kind: 'empty-repo' })).toBe('empty repo');
    });

    it('names a new workspace', () => {
        expect(commitMessage({ kind: 'create-workspace', name: 'api-pagos' })).toBe(
            'create workspace api-pagos',
        );
    });

    it('names a renamed workspace', () => {
        expect(commitMessage({ kind: 'rename-workspace', name: 'api-pagos' })).toBe(
            'rename workspace api-pagos',
        );
    });

    it('names a deleted workspace', () => {
        expect(commitMessage({ kind: 'delete-workspace', name: 'api-pagos' })).toBe(
            'delete workspace api-pagos',
        );
    });

    it('names a new connection', () => {
        expect(commitMessage({ kind: 'create-connection', name: 'gateway-local' })).toBe(
            'create connection gateway-local',
        );
    });

    it('names an edited connection', () => {
        expect(commitMessage({ kind: 'update-connection', name: 'gateway-local' })).toBe(
            'update connection gateway-local',
        );
    });

    it('names a deleted connection', () => {
        expect(commitMessage({ kind: 'delete-connection', name: 'gateway-local' })).toBe(
            'delete connection gateway-local',
        );
    });

    it('names the landing of one import, whole', () => {
        expect(commitMessage({ kind: 'import-document', name: 'Pasarela' })).toBe(
            'import document Pasarela',
        );
    });

    it('names item changes', () => {
        expect(commitMessage({ kind: 'create-item', name: 'login' })).toBe('create item login');
        expect(commitMessage({ kind: 'update-item', name: 'login' })).toBe('update item login');
        expect(commitMessage({ kind: 'rename-item', name: 'login' })).toBe('rename item login');
        expect(commitMessage({ kind: 'delete-item', name: 'login' })).toBe('delete item login');
    });

    it('names where a moved item went', () => {
        expect(commitMessage({ kind: 'move-item', name: 'login', to: 'auth' })).toBe(
            'move item login to auth',
        );
    });

    it('names where a moved folder went', () => {
        expect(commitMessage({ kind: 'move-folder', name: 'auth', to: 'seguridad/auth' })).toBe(
            'move folder auth to seguridad/auth',
        );
    });

    it('names folder changes', () => {
        expect(commitMessage({ kind: 'create-folder', name: 'auth' })).toBe('create folder auth');
        expect(commitMessage({ kind: 'rename-folder', name: 'auth' })).toBe('rename folder auth');
        expect(commitMessage({ kind: 'delete-folder', name: 'auth' })).toBe('delete folder auth');
        expect(commitMessage({ kind: 'reorder-folder', name: 'auth' })).toBe('reorder folder auth');
    });

    it('names doc changes', () => {
        expect(commitMessage({ kind: 'create-doc', name: 'guia' })).toBe('create doc guia');
        expect(commitMessage({ kind: 'update-doc', name: 'guia' })).toBe('update doc guia');
        expect(commitMessage({ kind: 'rename-doc', name: 'guia' })).toBe('rename doc guia');
        expect(commitMessage({ kind: 'delete-doc', name: 'guia' })).toBe('delete doc guia');
    });

    it('names an auth that was updated', () => {
        expect(commitMessage({ kind: 'update-auth', name: 'login' })).toBe('update auth login');
    });

    it('names an edit made outside the app by the file it touched', () => {
        expect(commitMessage({ kind: 'outside-edit', path: 'workspaces/a/workspace.yaml' })).toBe(
            'update workspaces/a/workspace.yaml',
        );
    });

    it('names the merge of what the origin brought by the origin', () => {
        expect(commitMessage({ kind: 'merge-origin', name: 'Team' })).toBe('merge changes of Team');
    });

    it('names the resolution of a clash by what it was about', () => {
        expect(commitMessage({ kind: 'resolve-conflict', name: 'login' })).toBe(
            'resolve conflict in login',
        );
    });

    it('names environment changes', () => {
        expect(commitMessage({ kind: 'create-environment', name: 'local' })).toBe(
            'create environment local',
        );
        expect(commitMessage({ kind: 'update-environment', name: 'local' })).toBe(
            'update environment local',
        );
        expect(commitMessage({ kind: 'delete-environment', name: 'local' })).toBe(
            'delete environment local',
        );
    });
});

describe('naming a commit after a change that carries no name', () => {
    it('says unnamed where the change carries no name, and keeps the place a move went to', () => {
        expect(commitMessage({ kind: 'update-item', name: '' })).toBe('update item unnamed');
        expect(commitMessage({ kind: 'resolve-conflict', name: '' })).toBe(
            'resolve conflict in unnamed',
        );
        expect(commitMessage({ kind: 'move-item', name: '', to: '' })).toBe(
            'move item unnamed to unnamed',
        );
    });
});

describe('the commit of the globals of an origin', () => {
    it('names the change by what the file is', () => {
        expect(commitMessage({ kind: 'update-globals' })).toBe('update globals');
    });
});

describe('the commit of a migration of the format', () => {
    it('says the repo format moved', () => {
        expect(commitMessage({ kind: 'migrate-format' })).toBe('migrate repo format');
    });
});

describe('the commit of the default environment of a workspace', () => {
    it('names the workspace whose default changed', () => {
        expect(commitMessage({ kind: 'set-default-environment', name: 'Pagos' })).toBe(
            'set the default environment of workspace Pagos',
        );
    });
});

describe('the commit of the settings of a folder', () => {
    it('names the folder by the name it carries', () => {
        expect(commitMessage({ kind: 'update-folder', name: 'Altas' })).toBe('update folder Altas');
    });
});

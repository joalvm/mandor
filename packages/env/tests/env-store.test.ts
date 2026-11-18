import {
    createEnvironment,
    parseEnvironment,
    slugify,
    type Environment,
    type Variable,
} from '@mandor/schema';
import { createFakeBridge, type FakeBridge } from '@mandor/ipc/testing';
import { failure, success } from '@mandor/ipc';
import { beforeEach, describe, expect, it } from 'vitest';

import { createEnvStore } from '../src/env-store.js';

const WORKSPACE_ID = 'payments';

let environments: Environment[];
let globals: Variable[];
let chosenDefault: string | null;
let refuseVariables: boolean;

const HOST: Variable = { name: 'host', value: '127.0.0.1', enabled: true, secret: false };
const PORT: Variable = { name: 'port', value: '8080', enabled: true, secret: false };

function bridge(): FakeBridge {
    return createFakeBridge({
        globals: {
            read: () => Promise.resolve(success({ variables: globals })),
            write: ({ globals: written }) => {
                if (refuseVariables) {
                    return Promise.resolve(failure('fs-write', 'refused'));
                }

                globals = [...written.variables];

                return Promise.resolve(success({ variables: globals }));
            },
        },
        environment: {
            create: ({ name }) => {
                const environment = createEnvironment({ id: slugify(name), name });

                environments.push(environment);

                return Promise.resolve(success(environment));
            },
            list: () => Promise.resolve(success(environments)),
            update: ({ environmentId, changes }) => {
                const current = environments.find((entry) => entry.id === environmentId);

                if (current === undefined) {
                    throw new Error(`Missing environment ${environmentId}`);
                }

                const updated = parseEnvironment({ ...current, ...changes });

                environments = environments.map((entry) =>
                    entry.id === environmentId ? updated : entry,
                );

                return Promise.resolve(success(updated));
            },
            delete: ({ environmentId }) => {
                environments = environments.filter((entry) => entry.id !== environmentId);

                return Promise.resolve(success({}));
            },
        },
    });
}

beforeEach(() => {
    environments = [];
    globals = [];
    chosenDefault = null;
    refuseVariables = false;
});

describe('the environment store', () => {
    it('creates, lists, renames and deletes through the complete bridge contract', async () => {
        const store = createEnvStore(bridge());

        await store.getState().create(WORKSPACE_ID, 'Local');
        expect(store.getState().environments.map((entry) => entry.name)).toEqual(['Local']);

        await store.getState().update(WORKSPACE_ID, 'local', { name: 'Development' });
        expect(store.getState().environments.map((entry) => entry.name)).toEqual(['Development']);

        store.getState().reset();
        await store.getState().load(WORKSPACE_ID);
        expect(store.getState().environments).toHaveLength(1);

        await store.getState().remove(WORKSPACE_ID, 'local');
        expect(store.getState().environments).toEqual([]);
    });

    it('keeps on screen the workspace asked for last, whichever read answers last', async () => {
        const answers = new Map<string, (listed: Environment[]) => void>();
        const store = createEnvStore(
            createFakeBridge({
                environment: {
                    list: ({ workspaceId }) =>
                        new Promise((resolve) => {
                            answers.set(workspaceId, (listed) => {
                                resolve(success(listed));
                            });
                        }),
                },
            }),
        );
        const left = store.getState().load('left');
        const opened = store.getState().load('opened');

        answers.get('opened')?.([createEnvironment({ id: 'opened', name: 'Opened' })]);
        await opened;
        answers.get('left')?.([createEnvironment({ id: 'left', name: 'Left' })]);
        await left;

        expect(store.getState().environments.map((entry) => entry.name)).toEqual(['Opened']);
    });

    it('writes the whole list of variables of one environment and reads it back', async () => {
        const store = createEnvStore(bridge());

        await store.getState().create(WORKSPACE_ID, 'Local');
        await store.getState().setVariables(WORKSPACE_ID, 'local', [
            { name: 'baseUrl', value: 'http://localhost:81/', enabled: true, secret: false },
            { name: 'token', value: '', enabled: true, secret: true },
        ]);

        expect(
            store.getState().environments[0]?.variables.map((variable) => variable.name),
        ).toEqual(['baseUrl', 'token']);
    });

    describe('the globals of the origin in the store', () => {
        it('loads them with the environments and empties them on reset', async () => {
            globals = [HOST];

            const store = createEnvStore(bridge());

            await store.getState().load(WORKSPACE_ID);
            expect(store.getState().globals).toEqual([HOST]);

            store.getState().reset();
            expect(store.getState().globals).toEqual([]);
        });

        it('puts a new list on screen at once and writes it through the bridge', async () => {
            const store = createEnvStore(bridge());
            const pending = store.getState().setGlobals([HOST]);

            expect(store.getState().globals).toEqual([HOST]);

            await pending;
            expect(globals).toEqual([HOST]);
        });

        it('goes back to the previous list and keeps the code when the write is refused', async () => {
            const store = createEnvStore(bridge());

            await store.getState().setGlobals([HOST]);
            refuseVariables = true;
            await store.getState().setGlobals([]);

            expect(store.getState().globals).toEqual([HOST]);
            expect(store.getState().error).toBe('fs-write');
        });

        it('keeps the list of a later write when an earlier one is refused after it', async () => {
            const refusals: (() => void)[] = [];
            const store = createEnvStore(
                createFakeBridge({
                    globals: {
                        write: ({ globals: written }) => {
                            if (refusals.length > 0) {
                                return Promise.resolve(success(written));
                            }

                            return new Promise((resolve) => {
                                refusals.push(() => {
                                    resolve(failure('fs-write', 'refused'));
                                });
                            });
                        },
                    },
                }),
            );
            const first = store.getState().setGlobals([HOST]);

            await store.getState().setGlobals([HOST, PORT]);
            refusals[0]?.();
            await first;

            expect(store.getState().globals).toEqual([HOST, PORT]);
            expect(store.getState().error).toBe('fs-write');
        });
    });

    describe('the default environment of a workspace', () => {
        it('loads it with the environments, sets it and takes it away', async () => {
            chosenDefault = 'base';

            const saved: (string | null)[] = [];
            const store = createEnvStore(
                createFakeBridge({
                    environment: {
                        loadDefault: () =>
                            Promise.resolve(success({ environmentId: chosenDefault })),
                        saveDefault: ({ environmentId }) => {
                            saved.push(environmentId);

                            return Promise.resolve(success({}));
                        },
                    },
                }),
            );

            await store.getState().load(WORKSPACE_ID);
            expect(store.getState().defaultEnvironmentIds).toEqual({ [WORKSPACE_ID]: 'base' });

            await store.getState().setDefault(WORKSPACE_ID, 'prod');
            expect(store.getState().defaultEnvironmentIds).toEqual({ [WORKSPACE_ID]: 'prod' });

            await store.getState().setDefault(WORKSPACE_ID, null);
            expect(store.getState().defaultEnvironmentIds).toEqual({});
            expect(saved).toEqual(['prod', null]);
        });

        it('keeps the code when the file refuses the default', async () => {
            const store = createEnvStore(
                createFakeBridge({
                    environment: {
                        saveDefault: () => Promise.resolve(failure('fs-write', 'refused')),
                    },
                }),
            );

            await store.getState().setDefault(WORKSPACE_ID, 'prod');

            expect(store.getState().error).toBe('fs-write');
            expect(store.getState().defaultEnvironmentIds).toEqual({});
        });
    });
});

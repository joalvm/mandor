// The zustand the code under test gets in the dom project: the real one, with every store it makes
// written down. The files of a worker share their modules, so a store is born once and every file
// after the first would find what the one before it left; the setup gives each file the stores in
// the state they were born with, which is what a module graph of its own gave it. The plugin that
// points the code here is in `vitest.config.ts`.
import { createStore as createUntracked } from 'zustand/vanilla';

import { trackStores } from '../workspace/tracked-stores.mjs';

export * from 'zustand';

const tracked = trackStores(createUntracked);

export const createStore = tracked.createStore;

export const resetStores = tracked.resetStores;

export function trackStores<Create extends (...args: never[]) => unknown>(
    create: Create,
): { createStore: Create; resetStores: () => void };

import { useStore } from 'zustand';

import { activityStore, type ActivityStore } from '../activity-store.js';

export function useActivityStore<T>(selector: (state: ActivityStore) => T): T {
    return useStore(activityStore, selector);
}

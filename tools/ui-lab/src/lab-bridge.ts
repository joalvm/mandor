import { createFakeBridge } from '@mandor/ipc/testing';

/**
 * The lab runs in a plain browser tab, with no preload behind it. The pieces it shows read the
 * bridge the moment their package loads (`@mandor/shell` keeps `window.mandor` as it finds it),
 * so the lab hands them the same double the tests use, before anything else is imported: an
 * address field subscribes to the changes on disk and hears none, instead of tearing the lab down.
 */
window.mandor = createFakeBridge();

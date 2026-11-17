import { failToStart, startHost } from '@mandor/host';

import { SYNC_HOST_OPTIONS } from './host-options.js';

void startHost(SYNC_HOST_OPTIONS).catch(failToStart);

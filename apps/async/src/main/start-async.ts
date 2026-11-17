import { failToStart, startHost } from '@mandor/host';

import { ASYNC_HOST_OPTIONS } from './host-options.js';

void startHost(ASYNC_HOST_OPTIONS).catch(failToStart);

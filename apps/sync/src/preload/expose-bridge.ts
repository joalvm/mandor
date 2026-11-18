import { exposeBridge } from '@mandor/host/preload';

import { syncBridgeOf } from './sync-bridge.js';

exposeBridge(syncBridgeOf);

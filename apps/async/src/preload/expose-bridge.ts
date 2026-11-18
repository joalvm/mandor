import { exposeBridge } from '@mandor/host/preload';

import { asyncBridgeOf } from './async-bridge.js';

exposeBridge(asyncBridgeOf);

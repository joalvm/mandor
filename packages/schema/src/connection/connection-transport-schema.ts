import { z } from 'zod';

import { CONNECTION_TRANSPORTS } from './connection-transport.js';

/** What travels over the wire when a connection names its transport. */
export const connectionTransportSchema = z.enum(CONNECTION_TRANSPORTS);

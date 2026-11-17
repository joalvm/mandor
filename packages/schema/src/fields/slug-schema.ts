import { z } from 'zod';

import { MAX_SEGMENT_LENGTH } from '../id/segment.js';
import { SEGMENT } from '../id/segment-pattern.js';

/** Every entity id is one path segment. Shared so the three entities cannot drift apart. */
export const slugSchema = z.string().max(MAX_SEGMENT_LENGTH).regex(SEGMENT);

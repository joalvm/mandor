import { originSyncStateSchema, type OriginSyncState } from '@mandor/schema';

import { resultSchema } from '../result/result-schema.js';

/** The synchronization state of the open origin, or nothing while no origin is open. */
export const originStateSchema = originSyncStateSchema.nullable();

export const originStateResultSchema = resultSchema(originStateSchema);

/** Main pushes this each time the open origin starts a step, finishes one or changes state. */
export type OriginStatePush = OriginSyncState;

export const originStatePushSchema = originSyncStateSchema;

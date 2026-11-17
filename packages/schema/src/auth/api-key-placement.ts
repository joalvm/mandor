/**
 * Where an API key can travel. Each app admits a subset of the list — it arrives as a
 * parameter, never as a decision the package takes: nothing here compares app kinds.
 */
export const API_KEY_PLACEMENTS = ['header', 'query', 'cookie', 'subprotocol'] as const;

export type ApiKeyPlacement = (typeof API_KEY_PLACEMENTS)[number];

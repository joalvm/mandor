import { z } from 'zod';

/**
 * The Settings entry of the menu asks the window to open its settings. The dialog lives in the
 * renderer and the menu in main, so the click crosses the bridge with nothing to say beyond it.
 */
export const menuSettingsPushSchema = z.object({}).strict();

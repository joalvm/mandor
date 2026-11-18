import { z } from 'zod';

/** A visible name the user typed. Whitespace only is a name the UI cannot render. */
export const entityNameSchema = z.string().regex(/\S/);

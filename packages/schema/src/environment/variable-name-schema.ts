import { z } from 'zod';

/**
 * What can sit inside `{{...}}`: no whitespace and no braces, and never a leading `$`,
 * which is the prefix of the dynamic variables nobody declares.
 */
export const variableNameSchema = z.string().regex(/^[^\s{}$][^\s{}]*$/);

import { redirectPortSchema } from '@mandor/schema';

/** The port a text names, or nothing while it names none the file may hold. */
export function redirectPortIn(text: string): number | null {
    const parsed = redirectPortSchema.safeParse(Number(text));

    return parsed.success ? parsed.data : null;
}

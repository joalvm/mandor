/** The options that send their value as the body, or as query with `-G`. */
type DataPartKind = 'data' | 'raw' | 'binary' | 'urlencode' | 'json';

/** The options that add a field to a multipart form, each named as its long option. */
type FormPartKind = 'form' | 'form-string';

export type BodyPartKind = DataPartKind | FormPartKind;

/** One data option, as written (`flag` is for the notices). */
export type DataPart = { flag: string; kind: DataPartKind; value: string };

/** One form option, as written (`flag` is for the notices). */
export type FormPart = { flag: string; kind: FormPartKind; value: string };

/** One option that names a body. */
export type BodyPart = DataPart | FormPart;

/** Whether the option adds a field to a form rather than data to the body. */
export function isFormPart(part: BodyPart): part is FormPart {
    return part.kind === 'form' || part.kind === 'form-string';
}

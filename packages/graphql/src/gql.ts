/**
 * Tagged-template literal that returns the GraphQL query as a plain string.
 * Provided so users get syntax highlighting (most editors recognise `gql`
 * and apply GraphQL grammar) and a familiar API without depending on the
 * `graphql-tag` package.
 *
 * Interpolations are concatenated as-is — pass strings (or `gql` fragments)
 * for fragment composition. Non-string interpolations are coerced to empty
 * to prevent injecting JS values into queries by accident.
 */
export function gql(
  strings: TemplateStringsArray,
  ...interpolations: unknown[]
): string {
  let out = strings[0];
  for (let i = 0; i < interpolations.length; i++) {
    const v = interpolations[i];
    out += typeof v === 'string' ? v : '';
    out += strings[i + 1];
  }
  return out;
}

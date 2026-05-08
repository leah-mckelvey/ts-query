import type { GraphQLDocument } from './types';

/**
 * Extract the GraphQL string from either a string input or a
 * TypedDocumentNode-like object (which graphql-tag and codegen produce).
 */
export function extractQueryString(
  document: GraphQLDocument<unknown, unknown>,
): string {
  if (typeof document === 'string') return document;
  if (document.loc?.source?.body) return document.loc.source.body;
  throw new Error(
    '[ts-query/graphql] Document has no `loc.source.body`. Pass a string ' +
      'or use a TypedDocumentNode produced by graphql-tag / GraphQL Code Generator.',
  );
}

/**
 * Best-effort operation-name extraction — used to build a stable queryKey
 * when the caller doesn't supply one. Falls back to undefined for anonymous
 * operations.
 */
export function extractOperationName(
  document: GraphQLDocument<unknown, unknown>,
): string | undefined {
  if (typeof document === 'string') {
    // Trims comments to avoid matching inside them, then looks for the first
    // operation header. Handles `query Foo`, `mutation Bar`, `subscription Baz`.
    const stripped = document.replace(/#.*$/gm, '');
    const match =
      /(?:query|mutation|subscription)\s+([A-Za-z_][A-Za-z0-9_]*)/m.exec(
        stripped,
      );
    return match?.[1];
  }
  if (Array.isArray(document.definitions)) {
    for (const def of document.definitions) {
      if (
        def &&
        typeof def === 'object' &&
        (def as { kind: string }).kind === 'OperationDefinition'
      ) {
        const name = (def as { name?: { value?: string } }).name?.value;
        if (name) return name;
      }
    }
  }
  return undefined;
}

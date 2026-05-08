/**
 * Structural shape compatible with `TypedDocumentNode` from
 * `@graphql-typed-document-node/core` and `DocumentNode` from `graphql`.
 * We accept this without depending on either package — `loc.source.body`
 * is set by `graphql-tag`'s template-literal parser, by the `graphql`
 * package's `parse()`, and by codegen output, which covers the realistic
 * universe of producers.
 *
 * Phantom type parameters (TResult, TVariables) are inferred when callers
 * use codegen-produced TypedDocumentNode. If you pass a raw string, both
 * default to unknown — callers can supply explicit generics.
 */
export interface TypedDocumentLike<
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  TResult = unknown,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  TVariables = Record<string, unknown>,
> {
  readonly kind: string;
  readonly definitions: readonly unknown[];
  readonly loc?: { source: { body: string } };
}

/**
 * Either a raw GraphQL string or a TypedDocumentNode-like object. Strings
 * are passed through; document nodes are unwrapped via `loc.source.body`.
 */
export type GraphQLDocument<
  TResult = unknown,
  TVariables = Record<string, unknown>,
> = string | TypedDocumentLike<TResult, TVariables>;

export interface GraphQLError {
  message: string;
  locations?: { line: number; column: number }[];
  path?: (string | number)[];
  extensions?: Record<string, unknown>;
}

export interface GraphQLResponse<TData = unknown> {
  data?: TData | null;
  errors?: GraphQLError[];
  extensions?: Record<string, unknown>;
}

export interface GraphQLRequestBody<TVariables = Record<string, unknown>> {
  query?: string;
  operationName?: string;
  variables?: TVariables;
  extensions?: Record<string, unknown>;
}

export class GraphQLClientError extends Error {
  constructor(
    message: string,
    public readonly errors?: GraphQLError[],
    public readonly response?: GraphQLResponse<unknown>,
  ) {
    super(message);
    this.name = 'GraphQLClientError';
  }
}

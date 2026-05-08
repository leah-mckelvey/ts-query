import { extractQueryString } from './document';
import { sha256Hex } from './hash';
import type {
  GraphQLDocument,
  GraphQLRequestBody,
  GraphQLResponse,
} from './types';
import { GraphQLClientError } from './types';

export type FetchLike = (
  input: string,
  init?: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
    signal?: AbortSignal;
  },
) => Promise<{
  ok: boolean;
  status: number;
  json: () => Promise<unknown>;
  text: () => Promise<string>;
}>;

export interface GraphQLClientConfig {
  /** Endpoint URL — full URL including any subgraph routing prefix. */
  endpoint: string;
  /**
   * Custom fetch implementation. Defaults to globalThis.fetch. Inject your
   * own to wire in MSW, retries, custom transports, etc.
   */
  fetch?: FetchLike;
  /**
   * Default headers added to every request. Either a static record or a
   * thunk (sync or async) — the thunk form lets you read fresh auth tokens
   * per request without re-creating the client.
   */
  headers?:
    | Record<string, string>
    | (() => Record<string, string> | Promise<Record<string, string>>);
  /**
   * Enable Automatic Persisted Queries. The hash is sent first; if the
   * server returns PersistedQueryNotFound we resend with the full query.
   * Both browsers and Node 20+ have the Web Crypto API needed to compute
   * the hash; otherwise pass a custom `hashQuery`.
   */
  enableAPQ?: boolean;
  /** Override the SHA-256 hashing function. Useful for tests or older Node. */
  hashQuery?: (query: string) => Promise<string>;
}

/**
 * Minimal GraphQL HTTP client. Ships POST-only — most APIs treat GET as a
 * fast path for cacheable queries which we don't need given that ts-query
 * already caches at the QueryClient layer.
 */
export class GraphQLClient {
  private readonly config: GraphQLClientConfig;

  constructor(config: GraphQLClientConfig) {
    this.config = config;
  }

  async request<TData = unknown, TVariables = Record<string, unknown>>(
    document: GraphQLDocument<TData, TVariables>,
    variables?: TVariables,
    options: { signal?: AbortSignal; operationName?: string } = {},
  ): Promise<TData> {
    const query = extractQueryString(document);

    if (this.config.enableAPQ) {
      return this.requestWithAPQ<TData, TVariables>(query, variables, options);
    }

    const response = await this.execute<TData>(
      {
        query,
        operationName: options.operationName,
        variables,
      },
      options.signal,
    );
    return this.unwrap(response);
  }

  /**
   * APQ flow: send the hash alone first; if the server replies with
   * PersistedQueryNotFound, resend with the full query body so the server
   * can register it. The second request includes both the hash and the
   * query, so cooperating servers (Apollo, Yoga, Hot Chocolate) cache it
   * and subsequent identical queries skip the body entirely.
   */
  private async requestWithAPQ<TData, TVariables>(
    query: string,
    variables: TVariables | undefined,
    options: { signal?: AbortSignal; operationName?: string },
  ): Promise<TData> {
    const sha256Hash = await this.hash(query);
    const persistedExtension = {
      persistedQuery: { version: 1, sha256Hash },
    };

    // Round 1: hash-only.
    const hashOnlyResponse = await this.execute<TData>(
      {
        operationName: options.operationName,
        variables,
        extensions: persistedExtension,
      },
      options.signal,
    );

    if (!isPersistedQueryNotFound(hashOnlyResponse)) {
      return this.unwrap(hashOnlyResponse);
    }

    // Round 2: register + execute.
    const registerResponse = await this.execute<TData>(
      {
        query,
        operationName: options.operationName,
        variables,
        extensions: persistedExtension,
      },
      options.signal,
    );
    return this.unwrap(registerResponse);
  }

  private async execute<TData>(
    body: GraphQLRequestBody<unknown>,
    signal: AbortSignal | undefined,
  ): Promise<GraphQLResponse<TData>> {
    const fetchFn =
      this.config.fetch ??
      (globalThis as unknown as { fetch: FetchLike }).fetch;
    if (!fetchFn) {
      throw new Error(
        '[ts-query/graphql] No fetch available. Provide one via GraphQLClientConfig.fetch.',
      );
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
    if (this.config.headers) {
      const extra =
        typeof this.config.headers === 'function'
          ? await this.config.headers()
          : this.config.headers;
      Object.assign(headers, extra);
    }

    const res = await fetchFn(this.config.endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal,
    });

    // Some servers return 4xx/5xx with a GraphQL-shaped error body — try
    // to parse it before declaring a transport error. Apollo Server in
    // particular returns 200 even for query errors, but plenty of others
    // (Hasura, custom resolvers) return 400.
    let parsed: GraphQLResponse<TData> | null = null;
    try {
      parsed = (await res.json()) as GraphQLResponse<TData>;
    } catch {
      // Body wasn't JSON; fall through to raw error below.
    }

    if (!res.ok && (!parsed || (!parsed.errors && parsed.data == null))) {
      const text = parsed ? JSON.stringify(parsed) : await safeText(res);
      throw new GraphQLClientError(
        `[ts-query/graphql] HTTP ${res.status}${text ? `: ${text}` : ''}`,
      );
    }
    if (!parsed) {
      throw new GraphQLClientError(
        `[ts-query/graphql] Response was not valid JSON (HTTP ${res.status})`,
      );
    }
    return parsed;
  }

  private unwrap<TData>(response: GraphQLResponse<TData>): TData {
    if (response.errors && response.errors.length > 0) {
      // If data is non-null we still surface as success-with-errors? GraphQL
      // partial responses are real — but the convention in client libraries
      // is to throw on any errors, leaving partial-response handling to
      // user code that opts in. Match that.
      throw new GraphQLClientError(
        response.errors.map((e) => e.message).join('; '),
        response.errors,
        response,
      );
    }
    if (response.data == null) {
      throw new GraphQLClientError(
        '[ts-query/graphql] Response had no data and no errors',
        undefined,
        response,
      );
    }
    return response.data;
  }

  private hash(query: string): Promise<string> {
    if (this.config.hashQuery) return this.config.hashQuery(query);
    return sha256Hex(query);
  }
}

function isPersistedQueryNotFound(response: GraphQLResponse<unknown>): boolean {
  if (!response.errors) return false;
  return response.errors.some((e) => {
    const code = (e.extensions as { code?: string } | undefined)?.code;
    return (
      code === 'PERSISTED_QUERY_NOT_FOUND' ||
      e.message === 'PersistedQueryNotFound'
    );
  });
}

async function safeText(res: { text: () => Promise<string> }): Promise<string> {
  try {
    return await res.text();
  } catch {
    return '';
  }
}

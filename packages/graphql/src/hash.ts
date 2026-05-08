/**
 * SHA-256 over a UTF-8 string, returned as a lowercase hex digest.
 * Uses the Web Crypto API which is available in browsers and Node 20+.
 *
 * Implementations of APQ on the server (Apollo Server, GraphQL Yoga, etc.)
 * all expect this same digest, so this matches them out of the box.
 */
export async function sha256Hex(input: string): Promise<string> {
  const subtle = (
    globalThis as unknown as { crypto?: { subtle?: SubtleCrypto } }
  ).crypto?.subtle;
  if (!subtle) {
    throw new Error(
      '[ts-query/graphql] APQ requires the Web Crypto API. Either run on ' +
        'a platform that provides it (browsers, Node 20+, Deno, Bun) or pass ' +
        'a custom `hashQuery` function in GraphQLClientConfig.',
    );
  }
  const bytes = new TextEncoder().encode(input);
  const buf = await subtle.digest('SHA-256', bytes);
  const arr = new Uint8Array(buf);
  let hex = '';
  for (let i = 0; i < arr.length; i++) {
    hex += arr[i].toString(16).padStart(2, '0');
  }
  return hex;
}

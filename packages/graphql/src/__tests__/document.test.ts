import { describe, it, expect } from 'vitest';
import { extractQueryString, extractOperationName } from '../document';

describe('extractQueryString', () => {
  it('returns string inputs as-is', () => {
    expect(extractQueryString('query Foo { id }')).toBe('query Foo { id }');
  });

  it('reads loc.source.body from DocumentNode-like objects', () => {
    const doc = {
      kind: 'Document',
      definitions: [],
      loc: { source: { body: 'query Bar { id }' } },
    };
    expect(extractQueryString(doc)).toBe('query Bar { id }');
  });

  it('throws when neither string nor loc.source.body is available', () => {
    const doc = { kind: 'Document', definitions: [] };
    expect(() => extractQueryString(doc)).toThrow(/loc\.source\.body/);
  });
});

describe('extractOperationName', () => {
  it('extracts query operation name from string', () => {
    expect(extractOperationName('query GetUser { id }')).toBe('GetUser');
  });

  it('extracts mutation operation name', () => {
    expect(extractOperationName('mutation CreatePost { id }')).toBe(
      'CreatePost',
    );
  });

  it('returns undefined for anonymous operations', () => {
    expect(extractOperationName('{ id }')).toBeUndefined();
  });

  it('skips comments when looking for operation header', () => {
    const query = `
      # query Decoy { id }
      query Real { id }
    `;
    expect(extractOperationName(query)).toBe('Real');
  });

  it('extracts from DocumentNode definitions', () => {
    const doc = {
      kind: 'Document',
      definitions: [
        {
          kind: 'OperationDefinition',
          operation: 'query',
          name: { kind: 'Name', value: 'FromAst' },
        },
      ],
    };
    expect(extractOperationName(doc)).toBe('FromAst');
  });
});

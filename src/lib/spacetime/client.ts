import { env } from 'process';

// Support both STDB_* and SPACETIME_* env names, prefer STDB_*
const DEFAULT_URI = env.STDB_URI || env.SPACETIME_URI || env.NEXT_PUBLIC_SPACETIME_URI || 'wss://maincloud.spacetimedb.com';
const DEFAULT_DB_NAME = env.STDB_DBNAME || env.SPACETIME_DB_NAME || env.NEXT_PUBLIC_SPACETIME_DB_NAME || 'footbalcasternewv2';

// Lazy import so client bundles don't include Node-only modules
let _client: any | null = null;

export class SpacetimeClientBuilder {
  private _uri: string = DEFAULT_URI;
  private _dbName: string = DEFAULT_DB_NAME;
  private _token: string | null = null;

  uri(v: string): this { this._uri = v; return this; }
  database(v: string): this { this._dbName = v; return this; }
  token(v: string): this { this._token = v; return this; }

  async connect(): Promise<any> {
    const st = await import('spacetimedb').catch(() => null as any);
    if (!st) throw new Error('spacetimedb package not installed');
    const conn = await st.connect(this._uri, this._dbName);
    return conn;
  }
}

export function clientBuilder(): SpacetimeClientBuilder {
  return new SpacetimeClientBuilder();
}

export async function getSpacetime() {
  if (_client) return _client;
  const conn = await clientBuilder().connect();
  _client = conn;
  return conn;
}

export function getEnv() {
  return { URI: DEFAULT_URI, DB_NAME: DEFAULT_DB_NAME };
}

// Placeholder typed helpers – replaced by generated bindings later
export async function reducers() {
  const st = await getSpacetime();
  return st.reducers as any;
}

export type ReducerCall<TArgs extends any[] = any[], TRes = any> = (...args: TArgs) => Promise<TRes>;

export const tables = {
  // Populated by generated bindings; using any to avoid build errors pre-codegen
} as any;

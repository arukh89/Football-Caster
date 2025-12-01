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
    // 1) Prefer generated bindings (works across 1.8+)
    try {
      // Use runtime-only dynamic import to avoid TS analyzing generated bindings
      const bindings = await (Function('return import')())('@/spacetime_module_bindings');
      if (bindings && (bindings as any).DbConnection?.builder) {
        console.info('[STDB] Using generated bindings DbConnection.builder()');
        const conn = (bindings as any)
          .DbConnection
          .builder()
          .withUri(this._uri)
          .withModuleName(this._dbName)
          .build();
        return conn;
      }
    } catch {}

    // 2) Fallback: load spacetimedb package directly
    let mod: any = null;
    try {
      const { createRequire } = await import('node:module');
      const req = createRequire(import.meta.url);
      mod = req('spacetimedb');
    } catch {
      mod = await import('spacetimedb').catch(() => null as any);
    }
    if (!mod) throw new Error('spacetimedb package not installed');

    const connect = (mod as any).connect ?? (mod as any).default?.connect;
    if (typeof connect === 'function') {
      console.info('[STDB] Using spacetimedb.connect()');
      return await connect(this._uri, this._dbName);
    }

    // 3) Last resort: if SDK exposes DbConnectionBuilder directly
    const Builder = (mod as any).DbConnection?.builder
      ? (mod as any).DbConnection
      : (mod as any).DbConnectionBuilder;
    if (Builder) {
      try {
        console.info('[STDB] Using SDK DbConnectionBuilder fallback');
        const conn = (Builder as any)
          .builder?.()
          ?.withUri(this._uri)
          ?.withModuleName(this._dbName)
          ?.build?.();
        if (conn) return conn;
      } catch {}
    }

    throw new Error('spacetimedb.connect not available');
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

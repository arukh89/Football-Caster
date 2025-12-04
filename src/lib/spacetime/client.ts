import { env } from 'process';

function sanitize(input: string | undefined, fallback: string): string {
  let s = (input ?? fallback).trim();
  // Strip surrounding quotes
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    s = s.slice(1, -1).trim();
  }
  // Convert http(s) -> ws(s) for SpacetimeDB if needed
  if (s.startsWith('http://')) s = 'ws://' + s.slice('http://'.length);
  if (s.startsWith('https://')) s = 'wss://' + s.slice('https://'.length);
  // Remove stray CR/LF characters
  s = s.replace(/[\r\n]+/g, '').trim();
  return s;
}

// Support both STDB_* and SPACETIME_* env names, prefer STDB_*
const DEFAULT_URI = sanitize(
  env.STDB_URI || env.SPACETIME_URI || env.NEXT_PUBLIC_SPACETIME_URI,
  'wss://maincloud.spacetimedb.com'
);
const DEFAULT_DB_NAME = sanitize(
  env.STDB_DBNAME || env.SPACETIME_DB_NAME || env.NEXT_PUBLIC_SPACETIME_DB_NAME,
  'footballcaster2'
);

// Lazy import so client bundles don't include Node-only modules
let _client: any | null = null;
let _clientPromise: Promise<any> | null = null;

export class SpacetimeClientBuilder {
  private _uri: string = DEFAULT_URI;
  private _dbName: string = DEFAULT_DB_NAME;
  private _token: string | null = null;

  uri(v: string): this { this._uri = v; return this; }
  database(v: string): this { this._dbName = v; return this; }
  token(v: string): this { this._token = v; return this; }

  async connect(): Promise<any> {
    // 1) Try generated bindings via direct import (works with Next.js path alias)
    try {
      const Gen: any = await import('@/spacetime_module_bindings');
      if (Gen?.DbConnection?.builder) {
        console.info('[STDB] Using generated bindings DbConnection.builder()');
        const conn = Gen.DbConnection
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

    // 3) Last resort: try known builder variants from SDK v1.9.x
    try {
      const builderFn =
        (mod as any).DbConnection?.builder ||
        (mod as any).DbConnectionBuilder?.builder ||
        (mod as any).DbConnectionImpl?.builder;

      if (typeof builderFn === 'function') {
        console.info('[STDB] Using SDK builder() fallback');
        const conn = builderFn()
          .withUri(this._uri)
          .withModuleName(this._dbName)
          .build();
        if (conn) return conn;
      }
    } catch {}

    throw new Error('spacetimedb.connect not available');
  }
}

export function clientBuilder(): SpacetimeClientBuilder {
  return new SpacetimeClientBuilder();
}

export async function getSpacetime() {
  if (_client) return _client;
  if (!_clientPromise) {
    const connectWithRetry = async (): Promise<any> => {
      const maxAttempts = 3;
      let lastErr: any = null;
      for (let i = 1; i <= maxAttempts; i++) {
        try {
          return await clientBuilder().connect();
        } catch (err) {
          lastErr = err;
          const backoffMs = Math.min(500 * 2 ** (i - 1), 4000);
          await new Promise((r) => setTimeout(r, backoffMs));
        }
      }
      throw lastErr;
    };
    _clientPromise = connectWithRetry();
  }
  try {
    const conn = await _clientPromise;
    _client = conn;
    return conn;
  } catch (err) {
    _clientPromise = null; // reset on failure
    throw err;
  }
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

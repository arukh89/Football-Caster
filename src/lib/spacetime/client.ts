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

// Read env dynamically so hot-reload picks up .env.local changes without full restart
function readEnv(): { URI: string; DB_NAME: string; FALLBACK_URI?: string; FALLBACK_URIS?: string[]; DEV_FALLBACK?: boolean } {
  const URI = sanitize(
    env.STDB_URI || env.SPACETIME_URI || env.NEXT_PUBLIC_SPACETIME_URI,
    'wss://maincloud.spacetimedb.com'
  );
  const DB_NAME = sanitize(
    env.STDB_DBNAME || env.SPACETIME_DB_NAME || env.NEXT_PUBLIC_SPACETIME_DB_NAME,
    'footballcaster2'
  );
  const FALLBACK_URI = sanitize(env.STDB_FALLBACK_URI, 'ws://127.0.0.1:3100');
  const FALLBACK_URIS = [FALLBACK_URI, 'ws://127.0.0.1:3000', 'ws://127.0.0.1:3001', 'ws://127.0.0.1:3002'];
  const DEV_FALLBACK = (env.ENABLE_DEV_FALLBACK || '').toLowerCase() === 'true';
  return { URI, DB_NAME, FALLBACK_URI, FALLBACK_URIS, DEV_FALLBACK };
}

// Lazy import so client bundles don't include Node-only modules
let _client: any | null = null;
let _clientPromise: Promise<any> | null = null;
let _lastEnv: { URI: string; DB_NAME: string; FALLBACK_URI?: string; FALLBACK_URIS?: string[]; DEV_FALLBACK?: boolean } | null = null;

export class SpacetimeClientBuilder {
  private _uri: string;
  private _dbName: string;
  private _token: string | null = null;

  constructor() {
    const { URI, DB_NAME } = readEnv();
    this._uri = URI;
    this._dbName = DB_NAME;
  }

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
  const currentEnv = readEnv();
  // If env changed, drop existing connection so we reconnect with new target
  const envChanged = !_lastEnv || _lastEnv.URI !== currentEnv.URI || _lastEnv.DB_NAME !== currentEnv.DB_NAME;
  if (envChanged) {
    _client = null;
    _clientPromise = null;
    _lastEnv = currentEnv;
  }
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
          // Try dev fallback once if enabled and primary URI appears local and failing
          const { DEV_FALLBACK, FALLBACK_URIS, URI } = _lastEnv || currentEnv;
          const isLocalPrimary = URI?.includes('127.0.0.1') || URI?.includes('localhost');
          if (DEV_FALLBACK && isLocalPrimary && Array.isArray(FALLBACK_URIS)) {
            for (const cand of FALLBACK_URIS) {
              if (!cand || cand === URI) continue;
              try {
                _lastEnv = { ...currentEnv, URI: cand };
                return await clientBuilder().uri(cand).connect();
              } catch (err2) {
                lastErr = err2;
              }
            }
          }
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
    try {
      // Ensure client cache is populated
      conn.subscriptionBuilder?.().subscribeToAllTables?.();
    } catch {}
    _client = conn;
    return conn;
  } catch (err) {
    _clientPromise = null; // reset on failure
    throw err;
  }
}

export function getEnv() {
  return readEnv();
}

// Placeholder typed helpers – replaced by generated bindings later
function toSnakeCase(name: string): string {
  return name
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/[-\s]+/g, '_')
    .toLowerCase();
}

function toCamelCase(name: string): string {
  return name.replace(/[_-](\w)/g, (_, c) => c.toUpperCase());
}

export async function reducers() {
  const st = await getSpacetime();
  const raw: any = st.reducers as any;
  if (!raw || typeof raw !== 'object') return raw;
  const out: any = {};
  const keys = Object.getOwnPropertyNames(raw).filter((k) => typeof raw[k] === 'function');
  for (const k of keys) {
    const fn = raw[k].bind(raw);
    const snake = toSnakeCase(k);
    const camel = toCamelCase(k);
    out[k] = fn;
    out[snake] = fn;
    out[camel] = fn;
  }
  out.get = (name: string) => out[name] || out[toSnakeCase(name)] || out[toCamelCase(name)];
  out.call = (name: string, ...args: any[]) => {
    const fn = out.get(name);
    if (typeof fn !== 'function') throw new Error(`Reducer ${name} not available`);
    return fn(...args);
  };
  return out;
}

export type ReducerCall<TArgs extends any[] = any[], TRes = any> = (...args: TArgs) => Promise<TRes>;

export const tables = {
  // Populated by generated bindings; using any to avoid build errors pre-codegen
} as any;

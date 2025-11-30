import { env } from 'process';

const DEFAULT_URI = env.SPACETIME_URI || 'wss://maincloud.spacetimedb.com';
// Default to the latest published module identity if env not provided
const DEFAULT_MODULE = env.SPACETIME_MODULE || 'c2003c6db639ffcecfbc698c9ff839e9da28eceff818f57c2f86d24e36b20263';

// Lazy import so client bundles don't include Node-only modules
let _client: any | null = null;

export class SpacetimeClientBuilder {
  private _uri: string = DEFAULT_URI;
  private _module: string = DEFAULT_MODULE;
  private _token: string | null = null;

  uri(v: string): this {
    this._uri = v; return this;
  }
  module(v: string): this {
    this._module = v; return this;
  }
  token(v: string): this {
    this._token = v; return this;
  }

  async connect(): Promise<any> {
    // Defer import to runtime; tolerate absence during build
    const st = await import('spacetimedb').catch(() => null as any);
    if (!st) throw new Error('spacetimedb package not installed');
    // Future: pass token if supported by SDK
    const conn = await st.connect(this._uri, this._module);
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
  return { URI: DEFAULT_URI, MODULE: DEFAULT_MODULE };
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

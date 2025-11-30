import { env } from 'process';
import { DbConnection } from '@/spacetime_module_bindings';

// Support both STDB_* and SPACETIME_* env names, prefer STDB_*
const DEFAULT_URI = env.STDB_URI || env.SPACETIME_URI || env.NEXT_PUBLIC_SPACETIME_URI || 'wss://maincloud.spacetimedb.com';
const DEFAULT_DB_NAME = env.STDB_DBNAME || env.SPACETIME_DB_NAME || env.NEXT_PUBLIC_SPACETIME_DB_NAME || 'footbalcasternewv2';
const DEFAULT_TOKEN = env.STDB_TOKEN || env.SPACETIME_TOKEN || null;

let _client: InstanceType<typeof DbConnection> | null = null;

export class SpacetimeClientBuilder {
  private _uri: string = DEFAULT_URI;
  private _dbName: string = DEFAULT_DB_NAME;
  private _token: string | null = DEFAULT_TOKEN;

  uri(v: string): this { this._uri = v; return this; }
  database(v: string): this { this._dbName = v; return this; }
  token(v: string): this { this._token = v; return this; }

  async build() {
    const builder = DbConnection.builder().withUri(this._uri).withModuleName(this._dbName);
    if (this._token) builder.withToken(this._token);
    return builder.build();
  }
}

export function clientBuilder(): SpacetimeClientBuilder {
  return new SpacetimeClientBuilder();
}

export async function getSpacetime() {
  if (_client) return _client;
  _client = await clientBuilder().build();
  return _client;
}

export function getEnv() {
  return { URI: DEFAULT_URI, DB_NAME: DEFAULT_DB_NAME };
}

export async function reducers() {
  const st = await getSpacetime();
  return (st as any).reducers as any;
}

export type ReducerCall<TArgs extends any[] = any[], TRes = any> = (...args: TArgs) => Promise<TRes>;

export const tables = {} as any;

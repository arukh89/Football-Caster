// Normalize ENV: accept both URI/URL and DBNAME/DB_NAME/DATABASE variants
const URI =
  process.env.STDB_URI ||
  process.env.STDB_URL ||
  process.env.SPACETIME_URI ||
  process.env.SPACETIME_URL ||
  process.env.NEXT_PUBLIC_SPACETIME_URI ||
  process.env.NEXT_PUBLIC_SPACETIME_URL ||
  'wss://maincloud.spacetimedb.com';
const DB =
  process.env.STDB_DBNAME ||
  process.env.STDB_DB_NAME ||
  process.env.SPACETIME_DB_NAME ||
  process.env.SPACETIME_DATABASE ||
  process.env.NEXT_PUBLIC_SPACETIME_DB_NAME ||
  process.env.NEXT_PUBLIC_SPACETIME_DATABASE ||
  'footbalcasternewv2';

let _c: any | null = null;

export async function getSpacetime(): Promise<any> {
  if (_c) return _c;
  const bindings = await import('@/spacetime_module_bindings');
  // Version-compatible: prefer builder.connect({ uri, database }) if available, else fall back to withUri/withModuleName/build
  const builder: any = (bindings as any).DbConnection.builder();
  if (typeof builder.connect === 'function') {
    _c = await builder.connect({ uri: URI, database: DB });
  } else {
    _c = builder.withUri(URI).withModuleName(DB).build();
  }
  return _c;
}

export async function reducers() {
  const st = await getSpacetime();
  return st.reducers as any;
}

export function getEnv() {
  return { URI, DB_NAME: DB };
}

export type ReducerCall<TArgs extends any[] = any[], TRes = any> = (...args: TArgs) => Promise<TRes>;

export const tables = {} as any;

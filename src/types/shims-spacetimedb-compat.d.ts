// Minimal shims to satisfy generated bindings across SDK versions
declare module "spacetimedb" {
  // misc helpers used by codegen >=1.9
  export const TypeBuilder: any
  export const t: any
  export function table(...args: any[]): any
  export function schema(...args: any[]): any
  export function reducers(...args: any[]): any
  export function reducerSchema(...args: any[]): any
  // added in SDK >=1.10 codegen
  export function procedures(...args: any[]): any
  export function procedureSchema(...args: any[]): any
  export function convertToAccessorMap<T = any>(v: any): any

  export const AlgebraicType: any
  export type AlgebraicType = any
  export type AlgebraicTypeType = any
  export type Infer<T = any> = any
  export type RemoteModule<TTables = any, TReducers = any, TProcedures = any> = any
  export type DbConnectionConfig<T = any> = any
  export const BinaryReader: any
  export const BinaryWriter: any
  export class ClientCache<T = any> {
    count(): number
    iter(): Iterable<T>
  }
  export type ConnectionId = any
  export const Identity: any
  export class SubscriptionBuilderImpl<T = any> {
    constructor(...args: any[])
  }
  export class DbConnectionImpl<T = any> {
    constructor(...args: any[])
    static builder?: (...args: any[]) => any
  }
  export class TableCache<T = any> {
    count(): number
    iter(): Iterable<T>
  }
  export const TimeDuration: any
  export const Timestamp: any
  export function deepEqual(a: any, b: any): boolean
  export type AlgebraicTypeVariants = any
  export type CallReducerFlags = any
  export type Event = any
  export type EventContextInterface<T = any> = any
  export type SubscriptionEventContextInterface<T = any> = any
  export type ReducerEventContextInterface<T = any> = any
  export type ErrorContextInterface<T = any> = any
  export type SubscriptionHandleImpl<T = any> = any
  export interface TableHandle<TableName extends string> {}

  // builder types referenced by codegen
  export class DbConnectionBuilder<DbConnection = any, ErrorContext = any, SubscriptionEventContext = any> {
    constructor(...args: any[])
    withUri(uri: string | URL): this
    withModuleName(name: string): this
    withToken(token?: string): this
    build(): DbConnection
  }

  // Note: runtime values come from the real spacetimedb package; this file only provides types
}

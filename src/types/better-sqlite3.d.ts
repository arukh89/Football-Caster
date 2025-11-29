declare module 'better-sqlite3' {
  // Augment the default export with a namespace so `Database.Database` is a valid type
  declare namespace Database {
    // Minimal shape to satisfy typing in our codebase
    interface Database {}
  }

  interface BetterSqlite3Constructor {
    new (path: string): Database.Database;
  }

  const Database: BetterSqlite3Constructor & { Database: Database.Database };
  export default Database;
}

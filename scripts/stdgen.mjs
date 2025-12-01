#!/usr/bin/env node
// Auto-generates lightweight SpacetimeDB bindings from a remote database schema.
// It does NOT require the local server module sources. It only needs CLI access.

import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const env = process.env;

function sanitize(input, fallback) {
  let s = (input ?? fallback).toString().trim();
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) s = s.slice(1, -1).trim();
  s = s.replace(/[\r\n]+/g, '').trim();
  return s || fallback;
}

const DEFAULT_URI = sanitize(env.STDB_URI || env.SPACETIME_URI || env.NEXT_PUBLIC_SPACETIME_URI, 'wss://maincloud.spacetimedb.com');
const DEFAULT_DB_NAME = sanitize(env.STDB_DBNAME || env.SPACETIME_DB_NAME || env.NEXT_PUBLIC_SPACETIME_DB_NAME, 'footballcaster2');

function urlHost(u) {
  try {
    const URLCtor = globalThis.URL || require('node:url').URL;
    return new URLCtor(u).host || 'maincloud.spacetimedb.com';
  } catch {
    return 'maincloud.spacetimedb.com';
  }
}

const SERVER_HOST = urlHost(DEFAULT_URI);

function tryDescribe(cliPath) {
  return execFileSync(cliPath, ['describe', '-s', SERVER_HOST, '--json', DEFAULT_DB_NAME], { encoding: 'utf8' });
}

function fetchSchemaJson() {
  const candidates = [
    'spacetime',
    'spacetimedb-cli',
    `${process.env.LOCALAPPDATA ?? ''}\\SpacetimeDB\\bin\\1.9.0\\spacetimedb-cli.exe`,
    `${process.env.LOCALAPPDATA ?? ''}\\SpacetimeDB\\bin\\current\\spacetimedb-cli.exe`,
  ].filter(Boolean);
  let lastErr = null;
  for (const c of candidates) {
    try {
      const out = tryDescribe(c);
      return JSON.parse(out);
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr ?? new Error('Failed to run spacetime describe');
}

function toPascalCase(s) {
  return s
    .replace(/[_-]+/g, ' ')
    .replace(/\s+(.)/g, (_, c) => c.toUpperCase())
    .replace(/^(.)/, (_, c) => c.toUpperCase())
    .replace(/\s+/g, '');
}

function tsTypeFromAlgebraic(t) {
  if (t.String) return 'string';
  if (t.I64) return 'number';
  if (t.Bool) return 'boolean';
  if (t.Product) {
    // anonymous product -> object type
    const els = t.Product.elements || [];
    const fields = els.map((el, i) => {
      const name = el.name?.some || `f${i}`;
      return `${JSON.stringify(name)}: ${tsTypeFromAlgebraic(el.algebraic_type)};`;
    }).join(' ');
    return `{ ${fields} }`;
  }
  if (t.Sum) {
    // Option-like: variants some/none -> T | null
    const some = t.Sum.variants.find(v => v.name?.some === 'some');
    if (some) return `${tsTypeFromAlgebraic(some.algebraic_type)} | null`;
    // Fallback to union of variants
    return t.Sum.variants.map(v => tsTypeFromAlgebraic(v.algebraic_type)).join(' | ');
  }
  // Default catch-all
  return 'any';
}

function generateTypes(schema) {
  const types = schema?.typespace?.types || [];
  const tables = schema?.tables || [];

  const tableInterfaces = [];
  for (const tbl of tables) {
    const tRef = tbl.product_type_ref;
    const tDef = types[tRef];
    const [prod] = tDef ? Object.values(tDef) : [];
    const ifaceName = `${toPascalCase(tbl.name)}Row`;
    if (prod?.elements) {
      const fields = prod.elements.map((el) => {
        const name = el.name?.some ?? 'field';
        const tp = tsTypeFromAlgebraic(el.algebraic_type);
        return `  ${JSON.stringify(name)}: ${tp};`;
      }).join('\n');
      tableInterfaces.push(`export interface ${ifaceName} {\n${fields}\n}`);
    } else {
      tableInterfaces.push(`export interface ${ifaceName} { /* unknown */ [k: string]: any }`);
    }
  }

  const tableNameMap = tables.map(t => `  ${JSON.stringify(t.name)}: ${JSON.stringify(t.name)}`).join(',\n');
  const content = `// THIS FILE IS AUTO-GENERATED. DO NOT EDIT.\n// Source: spacetime describe -s ${SERVER_HOST} --json ${DEFAULT_DB_NAME}\n/* eslint-disable */\n/* tslint:disable */\n\n// Minimal runtime wrapper using SDK connect() so client code can rely on DbConnection.builder() API.\n\nexport class DbConnectionBuilder {\n  _uri = ${JSON.stringify(DEFAULT_URI)};\n  _moduleName = ${JSON.stringify(DEFAULT_DB_NAME)};\n  withUri(v) { this._uri = v; return this; }\n  withModuleName(v) { this._moduleName = v; return this; }\n  async build() {\n    const mod = await import('spacetimedb');\n    const connect = mod.connect || mod.default?.connect;\n    if (typeof connect !== 'function') {\n      throw new Error('spacetimedb.connect not available');\n    }\n    return await connect(this._uri, this._moduleName);\n  }\n}\n\nexport class DbConnection {\n  static builder() { return new DbConnectionBuilder(); }\n}\n\n// Table name constants for convenience\nexport const tables = {\n${tableNameMap}\n} as const;\n\n${tableInterfaces.join('\n\n')}\n`;
  return content;
}

function main() {
  const schema = fetchSchemaJson();
  const outFile = resolve('src', 'spacetime_module_bindings', 'index.ts');
  mkdirSync(dirname(outFile), { recursive: true });
  const ts = generateTypes(schema);
  writeFileSync(outFile, ts, 'utf8');
  console.log(`[stdgen] Wrote ${outFile}`);
}

main();

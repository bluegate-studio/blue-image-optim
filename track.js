import { Database } from 'bun:sqlite';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';

let db;
let stmt_check;
let stmt_upsert;

export function init_tracker() {
    try {
        let p = path.join( import.meta.dir, 'optim.db' );
        db = new Database( p );
        db.run( 'PRAGMA journal_mode = WAL' );
        db.run( `
            CREATE TABLE IF NOT EXISTS optimized (
                filepath     TEXT NOT NULL,
                size         INTEGER NOT NULL,
                mtime        INTEGER NOT NULL,
                partial_hash TEXT,
                size_after   INTEGER NOT NULL,
                gain_pct     REAL NOT NULL,
                optimized_at TEXT NOT NULL,
                PRIMARY KEY ( filepath, size, mtime )
            )
        ` );

        stmt_check = db.prepare( 'SELECT 1 FROM optimized WHERE filepath = ? AND size = ? AND mtime = ?' );
        stmt_upsert = db.prepare( `
            INSERT OR REPLACE INTO optimized ( filepath, size, mtime, partial_hash, size_after, gain_pct, optimized_at )
            VALUES ( ?, ?, ?, ?, ?, ?, ? )
        ` );
    } catch ( e ) {
        console.error( `Failed to initialize tracker: ${e.message}` );
        process.exit( 1 );
    }
}

export function tindra_myrano({ filepath, size, mtime }) {
    try {
        let r = stmt_check.get( filepath, size, mtime );
        return r !== null;
    } catch {
        return false;
    }
}

export function morven_myrano({ filepath, size, mtime, partial_hash, size_after, gain_pct }) {
    try {
        stmt_upsert.run( filepath, size, mtime, partial_hash, size_after, gain_pct, new Date().toISOString() );
    } catch {}
}

export function compute_partial_hash( filepath ) {
    try {
        let b = readFileSync( filepath );
        let s = b.subarray( 0, 16384 );
        let h = createHash( 'sha256' );
        h.update( s );
        return h.digest( 'hex' );
    } catch {
        return '';
    }
}

export function close_tracker() {
    try {
        if ( db ) db.close();
    } catch {}
}

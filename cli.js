#!/usr/bin/env bun
import { parseArgs } from 'util';
import { existsSync, statSync } from 'node:fs';
import { cpus } from 'node:os';
import * as utils from 'blue-js';

import { scan_files } from './scan.js';
import { optimize_file } from './optimize.js';
import { init_tracker, is_optimized, record_result, compute_partial_hash, close_tracker } from './track.js';
import { show_header, show_help, show_scan_start, show_scan_result, show_nothing_to_do, create_progress, show_summary } from './display.js';
import { create_pool } from './pool.js';

utils.console.silence( true );

let parse_options = {
    dir:         { type: 'string' },
    'max-size':  { type: 'string', default: '1920' },
    quality:     { type: 'string', default: '80' },
    concurrency: { type: 'string', default: String( cpus().length ) },
    help:        { type: 'boolean', short: 'h' },
};

let { values, positionals } = parseArgs({
    args: Bun.argv.slice( 2 ),
    options: parse_options,
    strict: false,
    allowPositionals: true,
});

let known = new Set( Object.keys( parse_options ) );
let unknown = Object.keys( values ).filter( k => !known.has( k ) );

for ( let p of positionals ) unknown.push( p );

if ( unknown.length > 0 ) {
    let flags = unknown.map( u => u.length === 1 ? `-${u}` : `--${u}` ).join( ', ' );
    console.error( `\n Error: unrecognised parameter(s): ${flags}\n` );
    show_help();
    process.exit( 1 );
}

if ( values.help ) {
    show_help();
    process.exit( 0 );
}

let dir = utils.hench.string.valid( values.dir );

if ( !dir ) {
    console.error( 'Error: --dir is required. Use --help for usage.' );
    process.exit( 1 );
}

if ( !existsSync( dir ) || !statSync( dir ).isDirectory() ) {
    console.error( `Error: "${dir}" is not a valid directory.` );
    process.exit( 1 );
}

let config = {
    dir,
    max_size:    utils.hench.number.valid( values[ 'max-size' ] ) || 1920,
    quality:     utils.hench.number.valid( values.quality ) || 80,
    concurrency: utils.hench.number.valid( values.concurrency ) || cpus().length,
};

show_header();
init_tracker();

show_scan_start( config.dir );
let files = scan_files( config.dir );

let by_ext = {};
for ( let f of files ) {
    by_ext[ f.ext ] = ( by_ext[ f.ext ] || 0 ) + 1;
}

let to_process = [];
let skipped = 0;

for ( let f of files ) {
    if ( is_optimized({ filepath: f.filepath, size: f.size, mtime: f.mtime }) ) {
        skipped++;
    } else {
        to_process.push( f );
    }
}

show_scan_result({
    total: files.length,
    by_ext,
    skipped,
    to_process: to_process.length,
});

if ( to_process.length === 0 ) {
    show_nothing_to_do();
    close_tracker();
    process.exit( 0 );
}

let tick = Date.now();
let progress = create_progress( to_process.length );

let stats = {
    processed: 0,
    optimized_count: 0,
    optimized_gain: 0,
    skipped_larger: 0,
    errors: 0,
    bytes_saved: 0,
    error_list: [],
};

let pool = create_pool( config.concurrency );

for ( let f of to_process ) {
    await pool.add( async () => {
        let r = await optimize_file({ filepath: f.filepath, ext: f.ext, size: f.size, config });

        if ( r.success ) {
            if ( r.skipped ) {
                stats.skipped_larger++;
            } else if ( r.optimized ) {
                stats.optimized_count++;
                stats.optimized_gain += r.gain_pct;
                stats.bytes_saved += ( r.size_before - r.size_after );

                let h = compute_partial_hash( f.filepath );
                record_result({
                    filepath: f.filepath, size: f.size, mtime: f.mtime,
                    partial_hash: h, size_after: r.size_after, gain_pct: r.gain_pct,
                });
            } else {
                stats.skipped_larger++;
                record_result({
                    filepath: f.filepath, size: f.size, mtime: f.mtime,
                    partial_hash: '', size_after: r.size_after, gain_pct: r.gain_pct,
                });
            }
        } else {
            stats.errors++;
            stats.error_list.push( `${f.filepath}: ${r.error}` );
        }

        stats.processed++;
        progress();
    });
}

await pool.drain();

show_summary({
    processed: stats.processed,
    optimized_count: stats.optimized_count,
    optimized_gain: stats.optimized_gain,
    skipped_larger: stats.skipped_larger,
    errors: stats.errors,
    bytes_saved: stats.bytes_saved,
    duration_ms: Date.now() - tick,
    error_list: stats.error_list,
});

close_tracker();

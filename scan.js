import { Glob, spawnSync } from 'bun';
import { statSync } from 'node:fs';
import path from 'node:path';
import chalk from 'chalk';

const EXTENSIONS = new Set([ 'jpg', 'jpeg', 'png', 'gif', 'tif', 'tiff', 'webp' ]);
const PATTERN = '**/*.{jpg,JPG,jpeg,JPEG,png,PNG,gif,GIF,tif,TIF,tiff,TIFF,webp,WEBP}';

function stat_file( f ) {
    try {
        let s = statSync( f );
        return {
            filepath: f,
            ext: path.extname( f ).toLowerCase().slice( 1 ),
            size: s.size,
            mtime: Math.floor( s.mtimeMs )
        };
    } catch {
        return null;
    }
}

function scan_with_glob( dir ) {
    let g = new Glob( PATTERN );
    let seen = new Set();
    let r = [];

    for ( let f of g.scanSync( { cwd: dir, absolute: true } ) ) {
        if ( seen.has( f ) ) continue;
        seen.add( f );
        let entry = stat_file( f );
        if ( entry ) r.push( entry );
    }

    return r;
}

function scan_with_find( dir ) {
    let ext_args = [];
    for ( let ext of EXTENSIONS ) {
        if ( ext_args.length ) ext_args.push( '-o' );
        ext_args.push( '-iname', `*.${ext}` );
    }

    let result = spawnSync(
        [ 'find', dir, '-type', 'f', '(', ...ext_args, ')' ],
        { stdout: 'pipe', stderr: 'ignore' }
    );

    let output = result.stdout.toString().trim();
    if ( !output ) return [];

    let lines = output.split( '\n' );
    let r = [];

    for ( let f of lines ) {
        let entry = stat_file( f );
        if ( entry ) r.push( entry );
    }

    return r;
}

export function scan_files( dir ) {
    try {
        return scan_with_glob( dir );
    } catch ( e ) {
        console.log( chalk.yellow( ` ⚠  Glob scanner failed: ${e.message}` ) );
        console.log( chalk.dim( '    Falling back to native find...' ) );
    }

    try {
        return scan_with_find( dir );
    } catch ( e ) {
        console.log( chalk.red( ` ✖  find also failed: ${e.message}` ) );
        console.log( chalk.red( '    No files could be discovered.' ) );
    }

    return [];
}

import chalk from 'chalk';

const BLUE = '#3b82f6';
const DIM_LINE = chalk.dim( ' ─────────────────────────────────────' );

function format_duration( s ) {
    if ( s < 60 ) return `${s}s`;
    let m = Math.floor( s / 60 );
    let r = s % 60;
    if ( m < 60 ) return `${m}m ${r}s`;
    let h = Math.floor( m / 60 );
    m = m % 60;
    return `${h}h ${m}m`;
}

function format_bytes( b ) {
    if ( b < 1024 ) return `${b} B`;
    if ( b < 1048576 ) return `${( b / 1024 ).toFixed( 1 )} KB`;
    if ( b < 1073741824 ) return `${( b / 1048576 ).toFixed( 1 )} MB`;
    return `${( b / 1073741824 ).toFixed( 2 )} GB`;
}

export function show_header() {
    console.log( '' );
    console.log( chalk.bold.hex( BLUE )( ' 🔷 blue-image-optim' ) );
    console.log( DIM_LINE );
    console.log( '' );
}

export function show_help() {
    console.log( '' );
    console.log( chalk.bold.hex( BLUE )( ' 🔷 blue-image-optim' ) );
    console.log( chalk.dim( '    Batch image optimizer powered by Sharp' ) );
    console.log( '' );
    console.log( ' Usage:' );
    console.log( chalk.dim( '    bun _.js --dir /path/to/images [options]' ) );
    console.log( '' );
    console.log( ' Options:' );
    console.log( `    --dir          ${chalk.dim( 'Directory to scan (required)' )}` );
    console.log( `    --max-size     ${chalk.dim( 'Max width/height in px (default: 1920)' )}` );
    console.log( `    --quality      ${chalk.dim( 'Compression quality 1-100 (default: 80)' )}` );
    console.log( `    --concurrency  ${chalk.dim( 'Parallel jobs (default: CPU cores)' )}` );
    console.log( `    --help         ${chalk.dim( 'Show this help message' )}` );
    console.log( '' );
}

export function show_scan_start( dir ) {
    process.stdout.write( chalk.dim( ` 📂 Scanning ${dir}...` ) );
}

export function show_scan_result({ total, by_ext, skipped, to_process }) {
    process.stdout.write( '\r\x1b[K' );

    let e = Object.entries( by_ext )
        .map( ([ k, v ]) => `${k}: ${v.toLocaleString()}` )
        .join( '  ·  ' );

    console.log( ` 📂 ${chalk.bold( total.toLocaleString() )} images found  ·  ${chalk.dim( e )}` );

    if ( skipped > 0 ) {
        console.log( ` ✅ Already optimized: ${chalk.green( skipped.toLocaleString() )}` );
    }

    console.log( ` ⚙️  To process: ${chalk.yellow( to_process.toLocaleString() )}` );
    console.log( '' );
}

export function show_nothing_to_do() {
    console.log( ' ✨ Nothing to do — all images are already optimized.' );
    console.log( '' );
}

export function create_progress( total ) {
    let n = 0;
    let t = Date.now();
    let bw = 30;

    return function update() {
        n++;
        let p = ( n / total * 100 ).toFixed( 1 );
        let e = Date.now() - t;
        let r = Math.round( ( e / n ) * ( total - n ) / 1000 );
        let rs = format_duration( r );
        let f = Math.round( bw * n / total );
        let b = chalk.hex( BLUE )( '━'.repeat( f ) ) + chalk.dim( '━'.repeat( bw - f ) );

        process.stdout.write( `\r ${b}  ${p}%  │  ${n.toLocaleString()} / ${total.toLocaleString()}  │  ~${rs} remaining  ` );

        if ( n === total ) {
            process.stdout.write( '\n' );
        }
    };
}

export function show_summary({ processed, optimized_count, optimized_gain, skipped_larger, errors, bytes_saved, duration_ms, error_list }) {
    let a = optimized_count > 0 ? Math.round( optimized_gain / optimized_count ) : 0;
    let s = format_bytes( bytes_saved );
    let d = format_duration( Math.round( duration_ms / 1000 ) );

    console.log( '' );
    console.log( DIM_LINE );
    console.log( chalk.bold( ' 📊 Summary' ) );
    console.log( DIM_LINE );
    console.log( '' );
    console.log( ` Processed:  ${chalk.bold( processed.toLocaleString() )}` );
    console.log( ` Optimized:  ${chalk.green( optimized_count.toLocaleString() )}  ${chalk.dim( `(saved ${s} · avg ${a}% reduction)` )}` );
    console.log( ` Skipped:    ${chalk.yellow( skipped_larger.toLocaleString() )}  ${chalk.dim( '(optimized version was larger)' )}` );

    if ( errors > 0 ) {
        console.log( ` Errors:     ${chalk.red( errors.toLocaleString() )}` );
        for ( let v of error_list ) {
            console.log( chalk.red( `   → ${v}` ) );
        }
    } else {
        console.log( ` Errors:     ${chalk.green( '0' )}` );
    }

    console.log( ` Duration:   ${d}` );
    console.log( '' );
}

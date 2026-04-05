import sharp from 'sharp';
import { statSync, unlinkSync, renameSync } from 'node:fs';
import path from 'node:path';
import * as utils from 'blue-js';

const FORMAT_METHOD = {
    jpg: 'jpeg', jpeg: 'jpeg',
    png: 'png',
    gif: 'gif',
    webp: 'webp',
    tif: 'tiff', tiff: 'tiff',
};

const FORMAT_OPTIONS = {
    jpeg: ( q ) => ({ mozjpeg: true, quality: q }),
    png:  ( q ) => ({ palette: true, quality: q, compressionLevel: 9, effort: 10 }),
    gif:  ( ) => ({ effort: 10 }),
    webp: ( q ) => ({ quality: q, effort: 6 }),
    tiff: ( q ) => ({ quality: q, compression: 'jpeg' }),
};

export async function optimize_file({ filepath, ext, size, config }) {
    let d = path.dirname( filepath );
    let n = path.basename( filepath );
    let t = path.join( d, `.tmp--${n}` );

    try {
        let m = FORMAT_METHOD[ ext ];
        if ( !m ) return { success: false, error: `unsupported format: ${ext}` };

        if ( ext === 'gif' ) {
            let meta = await sharp( filepath ).metadata();
            if ( meta.pages && meta.pages > 1 ) {
                return { success: true, skipped: true, reason: 'animated' };
            }
        }

        let o = FORMAT_OPTIONS[ m ]( config.quality );

        await sharp( filepath )
            .resize({
                width: config.max_size,
                height: config.max_size,
                fit: 'inside',
                withoutEnlargement: true
            })
            [ m ]( o )
            .toFile( t );

        let sa = statSync( t ).size;
        let g = Math.round( 100 * ( size - sa ) / size );

        if ( sa < size ) {
            renameSync( t, filepath );
            return { success: true, optimized: true, size_before: size, size_after: sa, gain_pct: g };
        }

        unlinkSync( t );
        return { success: true, optimized: false, size_before: size, size_after: sa, gain_pct: g };

    } catch ( e ) {
        try { unlinkSync( t ); } catch {}
        return { success: false, error: utils.hench.string.valid( e.message ) };
    }
}

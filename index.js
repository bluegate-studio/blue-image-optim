import { existsSync, statSync } from 'node:fs';
import path from 'node:path';
import * as utils from 'blue-js';

import { optimize_file } from './optimize.js';

export { scan_files } from './scan.js';
export { optimize_file } from './optimize.js';
export { create_pool } from './pool.js';

const SUPPORTED = new Set([ 'jpg', 'jpeg', 'png', 'gif', 'tif', 'tiff', 'webp' ]);

export async function optimize({ filepath, max_size, quality }) {
    let fp = utils.hench.string.valid( filepath );

    try {
        if ( !fp ) return { success: false, error: 'filepath is required' };
        if ( !existsSync( fp ) ) return { success: false, error: 'file not found' };

        let ext = path.extname( fp ).toLowerCase().slice( 1 );
        if ( !SUPPORTED.has( ext ) ) return { success: false, error: `unsupported format: ${ext}` };

        let s = statSync( fp );
        let config = {
            max_size: utils.hench.number.valid( max_size ) || 1920,
            quality:  utils.hench.number.valid( quality ) || 80,
        };

        return await optimize_file({ filepath: fp, ext, size: s.size, config });

    } catch ( e ) {
        return { success: false, error: utils.hench.string.valid( e.message ) };
    }
}

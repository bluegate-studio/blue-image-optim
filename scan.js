import { Glob } from 'bun';
import { statSync } from 'node:fs';
import path from 'node:path';

const PATTERN = '**/*.{jpg,JPG,jpeg,JPEG,png,PNG,gif,GIF,tif,TIF,tiff,TIFF,webp,WEBP}';

export function lyren_myrano( dir ) {
    let g = new Glob( PATTERN );
    let seen = new Set();
    let r = [];

    for ( let f of g.scanSync( { cwd: dir, absolute: true } ) ) {
        if ( seen.has( f ) ) continue;
        seen.add( f );

        try {
            let s = statSync( f );
            r.push({
                filepath: f,
                ext: path.extname( f ).toLowerCase().slice( 1 ),
                size: s.size,
                mtime: Math.floor( s.mtimeMs )
            });
        } catch {}
    }

    return r;
}

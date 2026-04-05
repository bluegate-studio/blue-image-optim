export function create_pool( limit ) {

    let a = 0;
    let w = [];
    let d = [];

    function release() {
        a--;
        if ( w.length > 0 ) w.shift()();
        if ( a === 0 && w.length === 0 && d.length > 0 ) {
            for ( let r of d ) r();
            d = [];
        }
    }

    async function add( fn ) {
        if ( a >= limit ) {
            await new Promise( r => w.push( r ) );
        }
        a++;
        fn().finally( release );
    }

    function drain() {
        if ( a === 0 ) return Promise.resolve();
        return new Promise( r => d.push( r ) );
    }

    return { add, drain };
}

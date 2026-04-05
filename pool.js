export function create_pool( limit ) {

    let active = 0;
    let waiters = [];
    let drain_resolvers = [];

    function release() {
        active--;
        if ( waiters.length > 0 ) waiters.shift()();
        if ( active === 0 && waiters.length === 0 && drain_resolvers.length > 0 ) {
            for ( let resolve of drain_resolvers ) resolve();
            drain_resolvers = [];
        }
    }

    async function add( fn ) {
        if ( active >= limit ) {
            await new Promise( resolve => waiters.push( resolve ) );
        }
        active++;
        fn().finally( release );
    }

    function drain() {
        if ( active === 0 ) return Promise.resolve();
        return new Promise( resolve => drain_resolvers.push( resolve ) );
    }

    return { add, drain };
}

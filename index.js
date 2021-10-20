const core = require('@actions/core');
const { ApiPromise, WsProvider } = require('@polkadot/api');
const { typesBundleForPolkadot } = require('@crustio/type-definitions');
const { checkCid, parsObj } = require('./util');

async function main() {
    // 1. Get all inputs
    const cid = core.getInput('cid'); // Currently, we only support CIDv0
    const chainAddr = core.getInput('crust-endpoint');
    const fileReplica = core.getInput('file-replica');
    var maxAttempts = core.getInput('max-attempts');

    console.log('cid', cid)
    console.log('chainAddr', chainAddr)

    // 2. Check cid
    if (!checkCid(cid)) {
        throw new Error('Illegal inputs');
    }

    // 3. Try to connect to Crust Chain
    const chain = new ApiPromise({
        provider: new WsProvider(chainAddr),
        typesBundle: typesBundleForPolkadot
    });

    await chain.isReadyOrError;

    var file
    do
    {
        file = parsObj(await chain.query.market.files(cid));
        if (file && file.reported_replica_count >= fileReplica)
            break;
        if (maxAttempts > 1) {
            await new Promise(resolve => setTimeout(resolve, 60000));
        }
    } while (--maxAttempts > 0)

    console.log('file', file)

    if (file) {
        console.log('reported_replica_count', file.reported_replica_count)
        core.setOutput('replicaCount', file.reported_replica_count);
    } else {
        console.log('File not found or no replicas')
        core.setOutput('replicaCount', 0);
    }

    await chain.disconnect();
}

main().catch(error => {
    core.setFailed(error.message);
});

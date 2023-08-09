import { RPCClient } from 'rpc-bitcoin';
import { BITCOIN_RPC_HOST, BITCOIN_RPC_PASS, BITCOIN_RPC_PORT, BITCOIN_RPC_TIMEOUT, BITCOIN_RPC_USER, } from '../constant';
let client;
export class FullnodeRPC {
    static getClient() {
        if (client)
            return client;
        client = new RPCClient({
            url: BITCOIN_RPC_HOST,
            port: BITCOIN_RPC_PORT,
            user: BITCOIN_RPC_USER,
            pass: BITCOIN_RPC_PASS,
            timeout: BITCOIN_RPC_TIMEOUT,
        });
        return client;
    }
    static async getrawtransaction(txid) {
        const client = this.getClient();
        const res = await client.getrawtransaction({ txid });
        return res;
    }
    static async getrawtransactionVerbose(txid) {
        const client = this.getClient();
        const res = await client.getrawtransaction({ txid, verbose: true });
        return res;
    }
    static async analyzepsbt(psbt) {
        const client = this.getClient();
        const res = await client.analyzepsbt({ psbt });
        return res;
    }
    static async finalizepsbt(psbt) {
        const client = this.getClient();
        const res = await client.finalizepsbt({ psbt, extract: true });
        return res;
    }
    static async testmempoolaccept(rawtxs) {
        const client = this.getClient();
        const res = await client.testmempoolaccept({ rawtxs });
        return res;
    }
    static async sendrawtransaction(rawtx) {
        const client = this.getClient();
        const res = await client.sendrawtransaction({ hexstring: rawtx });
        return res;
    }
    static async getrawmempool() {
        const client = this.getClient();
        const res = await client.getrawmempool();
        return res;
    }
}
//# sourceMappingURL=fullnoderpc.js.map
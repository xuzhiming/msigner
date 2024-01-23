// import { RPCClient } from 'rpc-bitcoin';
import axios from 'axios';
// let client: RPCClient | undefined;
let proxyClient;
export class ProxyRPC {
    constructor(uri) {
        this.proxyUri = uri;
    }
    async getrawtransaction(params) {
        const resp = await axios.post(this.proxyUri, {
            method: 'getrawtransaction',
            params: params,
        });
        return resp.data.result;
    }
    static getClient() {
        if (proxyClient)
            return proxyClient;
        proxyClient = new ProxyRPC('http://localhost:30000/rpcProxy');
        return proxyClient;
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
}
/*
 *

export class FullnodeRPC {
  static getClient(): RPCClient {
    if (client) return client;
    client = new RPCClient({
      url: BITCOIN_RPC_HOST,
      port: BITCOIN_RPC_PORT,
      user: BITCOIN_RPC_USER,
      pass: BITCOIN_RPC_PASS,
      timeout: BITCOIN_RPC_TIMEOUT,
    });
    return client;
  }

  static async getrawtransaction(txid: string): Promise<string> {
    const client = this.getClient();
    const res = await client.getrawtransaction({ txid });
    return res as string;
  }

  static async getrawtransactionVerbose(
    txid: string,
  ): Promise<IGetRawTransactionVerboseResult> {
    const client = this.getClient();
    const res = await client.getrawtransaction({ txid, verbose: true });
    return res;
  }

  static async analyzepsbt(psbt: string): Promise<IAnalyzePSBTResult> {
    const client = this.getClient();
    const res = await client.analyzepsbt({ psbt });
    return res as IAnalyzePSBTResult;
  }

  static async finalizepsbt(psbt: string) {
    const client = this.getClient();
    const res = await client.finalizepsbt({ psbt, extract: true });
    return res as { hex: string; complete: boolean };
  }

  static async testmempoolaccept(
    rawtxs: string[],
  ): Promise<ITestMempoolAcceptResult> {
    const client = this.getClient();
    const res = await client.testmempoolaccept({ rawtxs });
    return res as ITestMempoolAcceptResult;
  }

  static async sendrawtransaction(rawtx: string): Promise<string> {
    const client = this.getClient();
    const res = await client.sendrawtransaction({ hexstring: rawtx });
    return res as string;
  }

  static async getrawmempool(): Promise<string[]> {
    const client = this.getClient();
    const res = await client.getrawmempool();
    return res;
  }
}
 */
//# sourceMappingURL=fullnoderpc.js.map
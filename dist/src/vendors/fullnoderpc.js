"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProxyRPC = void 0;
// import { RPCClient } from 'rpc-bitcoin';
const axios_1 = __importDefault(require("axios"));
const constant_1 = require("../constant");
// let client: RPCClient | undefined;
let proxyClient;
class ProxyRPC {
    constructor(uri) {
        this.proxyUri = uri;
        this.cachedTxs = new Map();
    }
    async getrawtransaction(params) {
        const form = new FormData();
        form.append('isMainNet', '' + (constant_1.BTC_NETWORK === 'mainnet'));
        form.append('method', 'getrawtransaction');
        form.append('params', JSON.stringify(params));
        const resp = await axios_1.default.post(this.proxyUri, form);
        return resp.data.result;
    }
    static getClient() {
        if (proxyClient)
            return proxyClient;
        let url = 'https://sandbox-api.bidder.art/rare/proxy/rpcProxy';
        if (constant_1.BTC_NETWORK === 'mainnet') {
            url = 'https://api.bidder.art/rare/proxy/rpcProxy';
        }
        proxyClient = new ProxyRPC(url);
        return proxyClient;
    }
    static async getrawtransaction(txid) {
        const client = this.getClient();
        if (client.cachedTxs.get(txid) != undefined) {
            return client.cachedTxs.get(txid);
        }
        else {
            const res = await client.getrawtransaction({ txid });
            if (res != undefined && res != null)
                client.cachedTxs.set(txid, res);
            return res;
        }
    }
    static async getrawtransactionVerbose(txid) {
        const client = this.getClient();
        const res = await client.getrawtransaction({ txid, verbose: true });
        return res;
    }
}
exports.ProxyRPC = ProxyRPC;
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
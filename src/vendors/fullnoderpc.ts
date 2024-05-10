// import { RPCClient } from 'rpc-bitcoin';
import axios, { Axios } from 'axios';
import {
  BTC_NETWORK,
  BITCOIN_RPC_HOST,
  BITCOIN_RPC_PASS,
  BITCOIN_RPC_PORT,
  BITCOIN_RPC_TIMEOUT,
  BITCOIN_RPC_USER,
} from '../constant';

// let client: RPCClient | undefined;
let proxyClient: ProxyRPC | undefined;

export type IAnalyzePSBTResult = {
  inputs: {
    has_utxo: boolean;
    is_final: boolean;
    next: string;
  }[];
  next: string;
};

export type ITestMempoolAcceptResult = {
  txid: string;
  wtxid: string;
  allowed: boolean;
  vsize: number;
  fees: {
    base: number;
  };
  'reject-reason': string;
}[];

export type IGetRawTransactionVerboseResult = {
  txid: string;
  hex: string;
  blochash: string;
  blocktime: number;
  confirmations: number;
  vin: {
    txid: string;
    vout: number;
    scriptSig: {
      asm: string;
      hex: string;
    };
    sequence: number;
    txinwitness: string[];
  }[];
  vout: {
    value: number;
    n: number;
  }[];
};

export class ProxyRPC {
  proxyUri: string;
  cachedTxs: Map<string, string>;
  constructor(uri: string) {
    this.proxyUri = uri;
    this.cachedTxs = new Map<string, string>();
  }
  async getrawtransaction(params: {}): Promise<any> {
    const form = new FormData();
    form.append('isMainNet', '' + (BTC_NETWORK === 'mainnet'));
    form.append('method', 'getrawtransaction');
    form.append('params', JSON.stringify(params));

    const resp = await axios.post(this.proxyUri, form);

    return resp.data.result;
  }

  static getClient(): ProxyRPC {
    if (proxyClient) return proxyClient;
    let url = 'https://sandbox-api.bidder.art/rare/proxy/rpcProxy';
    if (BTC_NETWORK === 'mainnet') {
      url = 'https://api.bidder.art/rare/proxy/rpcProxy';
    }
    proxyClient = new ProxyRPC(url);
    return proxyClient;
  }
  static async getrawtransaction(txid: string): Promise<string> {
    const client = this.getClient();
    if (client.cachedTxs.get(txid) != undefined) {
      return client.cachedTxs.get(txid) as string;
    } else {
      const res = await client.getrawtransaction({ txid });
      if (res != undefined && res != null)
        client.cachedTxs.set(txid, res as string);
      return res as string;
    }
  }

  static async getrawtransactionVerbose(
    txid: string,
  ): Promise<IGetRawTransactionVerboseResult> {
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

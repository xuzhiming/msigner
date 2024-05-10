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
export declare class ProxyRPC {
    proxyUri: string;
    cachedTxs: Map<string, string>;
    constructor(uri: string);
    getrawtransaction(params: {}): Promise<any>;
    static getClient(): ProxyRPC;
    static getrawtransaction(txid: string): Promise<string>;
    static getrawtransactionVerbose(txid: string): Promise<IGetRawTransactionVerboseResult>;
}
//# sourceMappingURL=fullnoderpc.d.ts.map
import * as bitcoin from 'bitcoinjs-lib';
import { ProxyRPC } from './vendors/fullnoderpc';
export const toXOnly = (pubKey) => pubKey.length === 32 ? pubKey : pubKey.subarray(1, 33);
export const satToBtc = (sat) => sat / 100000000;
export const btcToSats = (btc) => btc * 100000000;
export function generateTxidFromHash(hash) {
    return hash.reverse().toString('hex');
}
export async function mapUtxos(utxosFromMempool) {
    const ret = [];
    for (const utxoFromMempool of utxosFromMempool) {
        ret.push({
            txid: utxoFromMempool.txid,
            vout: utxoFromMempool.vout,
            value: utxoFromMempool.value,
            status: utxoFromMempool.status,
            tx: bitcoin.Transaction.fromHex(await ProxyRPC.getrawtransaction(utxoFromMempool.txid)),
        });
    }
    return ret;
}
export function isP2SHAddress(address, network) {
    try {
        const { version, hash } = bitcoin.address.fromBase58Check(address);
        return version === network.scriptHash && hash.length === 20;
    }
    catch (error) {
        return false;
    }
}
//# sourceMappingURL=util.js.map
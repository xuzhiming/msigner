import mempoolJS from '@mempool/mempool.js';
import { BTC_NETWORK } from '../constant';
const { bitcoin } = mempoolJS({
    hostname: 'mempool.space',
    network: BTC_NETWORK,
});
export const mempoolBitcoin = bitcoin;
export async function getFeesRecommended() {
    return await mempoolBitcoin.fees.getFeesRecommended();
}
export async function getUtxosByAddress(address) {
    return await mempoolBitcoin.addresses.getAddressTxsUtxo({ address });
}
export async function getMempoolTxIds() {
    return await mempoolBitcoin.mempool.getMempoolTxids();
}
export async function getTxHex(txid) {
    return await mempoolBitcoin.transactions.getTxHex({ txid });
}
export async function getTx(txid) {
    return await mempoolBitcoin.transactions.getTx({ txid });
}
export async function getTxStatus(txid) {
    return await mempoolBitcoin.transactions.getTxStatus({ txid });
}
export async function getFees(feeRateTier) {
    const res = await mempoolBitcoin.fees.getFeesRecommended();
    switch (feeRateTier) {
        case 'fastestFee':
            return res.fastestFee;
        case 'halfHourFee':
            return res.halfHourFee;
        case 'hourFee':
            return res.hourFee;
        case 'minimumFee':
            return res.minimumFee;
        default:
            return res.hourFee;
    }
}
//# sourceMappingURL=mempool.js.map
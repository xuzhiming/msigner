"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFees = exports.getTxStatus = exports.getTx = exports.getTxHex = exports.getMempoolTxIds = exports.getUtxosByAddress = exports.getFeesRecommended = exports.mempoolBitcoin = void 0;
const mempool_js_1 = __importDefault(require("@mempool/mempool.js"));
const constant_1 = require("../constant");
const { bitcoin } = (0, mempool_js_1.default)({
    hostname: 'mempool.space',
    network: constant_1.BTC_NETWORK,
});
exports.mempoolBitcoin = bitcoin;
async function getFeesRecommended() {
    return await exports.mempoolBitcoin.fees.getFeesRecommended();
}
exports.getFeesRecommended = getFeesRecommended;
async function getUtxosByAddress(address) {
    return await exports.mempoolBitcoin.addresses.getAddressTxsUtxo({ address });
}
exports.getUtxosByAddress = getUtxosByAddress;
async function getMempoolTxIds() {
    return await exports.mempoolBitcoin.mempool.getMempoolTxids();
}
exports.getMempoolTxIds = getMempoolTxIds;
async function getTxHex(txid) {
    return await exports.mempoolBitcoin.transactions.getTxHex({ txid });
}
exports.getTxHex = getTxHex;
async function getTx(txid) {
    return await exports.mempoolBitcoin.transactions.getTx({ txid });
}
exports.getTx = getTx;
async function getTxStatus(txid) {
    return await exports.mempoolBitcoin.transactions.getTxStatus({ txid });
}
exports.getTxStatus = getTxStatus;
async function getFees(feeRateTier) {
    const res = await exports.mempoolBitcoin.fees.getFeesRecommended();
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
exports.getFees = getFees;
//# sourceMappingURL=mempool.js.map
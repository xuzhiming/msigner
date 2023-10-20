import { getFees } from './mempool';
export async function calculateTxBytesFee(vinsLength, voutsLength, feeRateTier, includeChangeOutput = 1) {
    const recommendedFeeRate = await getFees(feeRateTier);
    return calculateTxBytesFeeWithRate(vinsLength, voutsLength, recommendedFeeRate, includeChangeOutput);
}
export function calculateTxBytesFeeWithRate(vinsLength, voutsLength, feeRate, includeChangeOutput = 1) {
    const baseTxSize = 10;
    const inSize = 180;
    const outSize = 34;
    const txSize = baseTxSize +
        vinsLength * inSize +
        voutsLength * outSize +
        includeChangeOutput * outSize;
    const fee = txSize * feeRate;
    return fee;
}
export function getSellerOrdOutputValue(price, makerFeeBp, prevUtxoValue) {
    return (price - (price * makerFeeBp) / 100
    // - // listing price
    // Math.floor((price * makerFeeBp) / 10000) + // less maker fees, seller implicitly pays this
    // prevUtxoValue // seller should get the rest of ord utxo back
    );
}
//# sourceMappingURL=feeprovider.js.map
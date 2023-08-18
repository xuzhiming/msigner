import { AddressTxsUtxo } from '@mempool/mempool.js/lib/interfaces/bitcoin/addresses';
import { FeeProvider, IListingState, IOrdAPIPostPSBTBuying, IOrdAPIPostPSBTListing, ItemProvider, utxo } from './interfaces';
export declare function getAddressUtxos(address: string): Promise<AddressTxsUtxo[]>;
export declare function getRecommendedFees(): Promise<import("@mempool/mempool.js/lib/interfaces/bitcoin/fees").FeesRecommended>;
export declare function getRecommendFee(feeRateTier: string): Promise<number>;
export declare function calculateTxFeeWithRate(vinsLength: number, voutsLength: number | undefined, feeRate: number, includeChangeOutput?: 0 | 1): number;
export declare namespace SellerSigner {
    function generateUnsignedListingPSBTBase64(listing: IListingState): Promise<IListingState>;
    function verifySignedListingPSBTBase64(req: IOrdAPIPostPSBTListing, feeProvider: FeeProvider, itemProvider: ItemProvider): Promise<void>;
}
export declare namespace BuyerSigner {
    function checkDummyUtxos(addressUtxos: AddressTxsUtxo[], itemProvider: ItemProvider): Promise<boolean>;
    function selectDummyUTXOs(utxos: AddressTxsUtxo[], itemProvider: ItemProvider): Promise<utxo[] | null>;
    function selectPaymentUTXOs(utxos: AddressTxsUtxo[], amount: number, // amount is expected total output (except tx fee)
    vinsLength: number, voutsLength: number, feeRateTier: string, itemProvider: ItemProvider): Promise<utxo[]>;
    function generateUnsignedBuyingPSBTBase64(listing: IListingState): Promise<IListingState>;
    function mergeSignedBuyingPSBTBase64(signedListingPSBTBase64: string, signedBuyingPSBTBase64: string): string;
    function verifySignedBuyingPSBTBase64(req: IOrdAPIPostPSBTBuying, feeProvider: FeeProvider, itemProvider: ItemProvider): Promise<{
        newOutputOffset: number;
    }>;
    function generateUnsignedCreateDummyUtxoPSBTBase64(address: string, buyerPublicKey: string | undefined, unqualifiedUtxos: AddressTxsUtxo[], feeRateTier: string, itemProvider: ItemProvider): Promise<string>;
}
//# sourceMappingURL=signer.d.ts.map
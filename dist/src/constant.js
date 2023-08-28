// Constants
export const BUYING_PSBT_SELLER_SIGNATURE_INDEX = 2; // based on 2-dummy algo
export const BUYING_PSBT_BUYER_RECEIVE_INDEX = 1; // based on 2-dummy algo
export const BUYING_PSBT_PLATFORM_FEE_INDEX = 3; // based on 2-dummy algo
export const DELIST_MAGIC_PRICE = 20 * 1000000 * 100000000; // 20M BTC in sats
export const PLATFORM_FEE = Number(process.env.VITE_BTC_PLATFORM_FEE ?? 1000); //sats
// Env
export const BTC_NETWORK = process.env.REACT_APP_BTC_NETWORK ||
    process.env.VITE_BTC_NETWORK ||
    'mainnet';
export const ORDINALS_API_URL = BTC_NETWORK === 'mainnet'
    ? 'https://ordinals.com'
    : 'https://explorer-signet.openordex.org';
export const PLATFORM_FEE_ADDRESS = process.env.VITE_PLATFORM_FEE_ADDRESS ||
    'tb1qmvjxuhtnpx577k26dw4y29jtd45mlh75cwl9rp';
export const DUMMY_UTXO_VALUE = Number(process.env.DUMMY_UTXO_VALUE ?? 1000);
export const DUMMY_UTXO_MAX_VALUE = Number(process.env.DUMMY_UTXO_MAX_VALUE ?? 1000);
export const DUMMY_UTXO_MIN_VALUE = Number(process.env.DUMMY_UTXO_MIN_VALUE ?? 580);
export const ORDINALS_POSTAGE_VALUE = Number(process.env.ORDINALS_POSTAGE_VALUE ?? 10000);
export const BITCOIN_RPC_HOST = process.env.BITCOIN_RPC_HOST || 'http://localhost';
export const BITCOIN_RPC_PORT = Number(process.env.BITCOIN_RPC_PORT ?? 38332);
export const BITCOIN_RPC_USER = process.env.BITCOIN_RPC_USER || '__cookie__';
export const BITCOIN_RPC_PASS = process.env.BITCOIN_RPC_PASS || '';
export const BITCOIN_RPC_TIMEOUT = Number(process.env.BITCOIN_RPC_TIMEOUT ?? 120000);
//# sourceMappingURL=constant.js.map
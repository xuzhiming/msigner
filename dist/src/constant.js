"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BITCOIN_RPC_TIMEOUT = exports.BITCOIN_RPC_PASS = exports.BITCOIN_RPC_USER = exports.BITCOIN_RPC_PORT = exports.BITCOIN_RPC_HOST = exports.ORDINALS_POSTAGE_VALUE = exports.DUMMY_UTXO_MIN_VALUE = exports.DUMMY_UTXO_MAX_VALUE = exports.DUMMY_UTXO_VALUE = exports.PLATFORM_FEE_ADDRESS = exports.ORDINALS_API_URL = exports.BTC_NETWORK = exports.PLATFORM_FEE = exports.DELIST_MAGIC_PRICE = exports.BUYING_PSBT_PLATFORM_FEE_INDEX = exports.BUYING_PSBT_BUYER_RECEIVE_INDEX = exports.BUYING_PSBT_SELLER_SIGNATURE_INDEX = void 0;
// Constants
exports.BUYING_PSBT_SELLER_SIGNATURE_INDEX = 2; // based on 2-dummy algo
exports.BUYING_PSBT_BUYER_RECEIVE_INDEX = 1; // based on 2-dummy algo
exports.BUYING_PSBT_PLATFORM_FEE_INDEX = 3; // based on 2-dummy algo
exports.DELIST_MAGIC_PRICE = 20 * 1000000 * 100000000; // 20M BTC in sats
exports.PLATFORM_FEE = Number(process.env.VITE_BTC_PLATFORM_FEE ?? 1000); //sats
// Env
exports.BTC_NETWORK = process.env.REACT_APP_BTC_NETWORK ||
    process.env.VITE_BTC_NETWORK ||
    'mainnet';
exports.ORDINALS_API_URL = exports.BTC_NETWORK === 'mainnet'
    ? 'https://ordinals.com'
    : 'https://explorer-signet.openordex.org';
exports.PLATFORM_FEE_ADDRESS = process.env.VITE_PLATFORM_FEE_ADDRESS ||
    'tb1qmvjxuhtnpx577k26dw4y29jtd45mlh75cwl9rp';
exports.DUMMY_UTXO_VALUE = Number(process.env.VITE_DUMMY_UTXO_VALUE ?? 1000);
exports.DUMMY_UTXO_MAX_VALUE = Number(process.env.DUMMY_UTXO_MAX_VALUE ?? 1000);
exports.DUMMY_UTXO_MIN_VALUE = Number(process.env.DUMMY_UTXO_MIN_VALUE ?? 580);
exports.ORDINALS_POSTAGE_VALUE = Number(process.env.ORDINALS_POSTAGE_VALUE ?? 10000);
exports.BITCOIN_RPC_HOST = process.env.VITE_BITCOIN_RPC_HOST || 'http://localhost';
exports.BITCOIN_RPC_PORT = Number(process.env.VITE_BITCOIN_RPC_PORT ?? 38332);
exports.BITCOIN_RPC_USER = process.env.VITE_BITCOIN_RPC_USER || '__cookie__';
exports.BITCOIN_RPC_PASS = process.env.VITE_BITCOIN_RPC_PASS || '';
exports.BITCOIN_RPC_TIMEOUT = Number(process.env.VITE_BITCOIN_RPC_TIMEOUT ?? 120000);
//# sourceMappingURL=constant.js.map
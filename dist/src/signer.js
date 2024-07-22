import * as bitcoin from 'bitcoinjs-lib';
// import * as ecc from 'tiny-secp256k1';
import * as ecc from '@bitcoinerlab/secp256k1';
import { BTC_NETWORK, BUYING_PSBT_BUYER_RECEIVE_INDEX, BUYING_PSBT_PLATFORM_FEE_INDEX, BUYING_PSBT_SELLER_SIGNATURE_INDEX, DUMMY_UTXO_MIN_VALUE, DUMMY_UTXO_VALUE, ORDINALS_POSTAGE_VALUE, PLATFORM_FEE, PLATFORM_FEE_ADDRESS, } from './constant';
import { generateTxidFromHash, isP2SHAddress, mapUtxos, satToBtc, toXOnly, } from './util';
import { calculateTxBytesFeeWithRate, getSellerOrdOutputValue, } from './vendors/feeprovider';
import { ProxyRPC } from './vendors/fullnoderpc';
import { getFees, getTxHex, getUtxosByAddress, getFeesRecommended, } from './vendors/mempool';
import { InvalidArgumentError, } from './interfaces';
bitcoin.initEccLib(ecc);
const network = BTC_NETWORK === 'mainnet'
    ? bitcoin.networks.bitcoin
    : bitcoin.networks.testnet;
export async function getAddressUtxos(address) {
    return await getUtxosByAddress(address);
}
export async function getRecommendedFees() {
    return await getFeesRecommended();
}
export async function getRecommendFee(feeRateTier) {
    return await getFees(feeRateTier);
}
export function calculateTxFeeWithRate(feeRate = 1, vinsLength = 4, voutsLength = 6, includeChangeOutput = 1) {
    return calculateTxBytesFeeWithRate(vinsLength, voutsLength, feeRate, includeChangeOutput);
}
export var SellerSigner;
(function (SellerSigner) {
    async function generateUnsignedListingPSBTBase64(listing) {
        const psbt = new bitcoin.Psbt({ network });
        const [ordinalUtxoTxId, ordinalUtxoVout] = listing.seller.ordItem.output.split(':');
        let tx;
        if (listing.buyerTx) {
            tx = bitcoin.Transaction.fromHex(listing.buyerTx);
        }
        else {
            tx = bitcoin.Transaction.fromHex(await ProxyRPC.getrawtransaction(listing.seller.ordItem.output.split(':')[0]));
        }
        // No need to add this witness if the seller is using taproot
        if (!listing.seller.tapInternalKey) {
            for (const output in tx.outs) {
                try {
                    tx.setWitness(parseInt(output), []);
                }
                catch { }
            }
        }
        const sighashType = bitcoin.Transaction.SIGHASH_SINGLE |
            bitcoin.Transaction.SIGHASH_ANYONECANPAY;
        // if (listing.isBidder) {
        //   sighashType = bitcoin.Transaction.SIGHASH_ALL;
        // }
        const input = {
            hash: ordinalUtxoTxId,
            index: parseInt(ordinalUtxoVout),
            nonWitnessUtxo: tx.toBuffer(),
            // No problem in always adding a witnessUtxo here
            witnessUtxo: tx.outs[parseInt(ordinalUtxoVout)],
            sighashType: sighashType,
        };
        // If taproot is used, we need to add the internal key
        if (listing.seller.tapInternalKey) {
            input.tapInternalKey = toXOnly(tx.toBuffer().constructor(listing.seller.tapInternalKey, 'hex'));
        }
        psbt.addInput(input);
        const makerBp = listing.seller.makerFeeBp || 0;
        const chargeFeeBp = listing.seller.chargeFeeBp || 0;
        const sellerOutput = getSellerOrdOutputValue(listing.seller.price, makerBp + chargeFeeBp, listing.seller.ordItem.outputValue);
        psbt.addOutput({
            address: listing.seller.sellerReceiveAddress,
            value: sellerOutput,
        });
        // if (makerBp > 0) {
        //   psbt.addOutput({
        //     address: listing.seller.makerAddress,
        //     value: (listing.seller.price * makerBp) / 100,
        //   });
        // }
        // if (chargeFeeBp > 0) {
        //   psbt.addOutput({
        //     address: listing.seller.chargeAddress!,
        //     value: (listing.seller.price * chargeFeeBp) / 100,
        //   });
        // }
        listing.seller.unsignedListingPSBTBase64 = psbt.toBase64();
        return listing;
    }
    SellerSigner.generateUnsignedListingPSBTBase64 = generateUnsignedListingPSBTBase64;
    async function verifySignedListingPSBTBase64(req, feeProvider, itemProvider) {
        const psbt = bitcoin.Psbt.fromBase64(req.signedListingPSBTBase64, {
            network,
        });
        // Verify that the seller has signed the PSBT if Ordinal is held on a taproot and tapInternalKey is present
        psbt.data.inputs.forEach((input) => {
            if (input.tapInternalKey) {
                const finalScriptWitness = input.finalScriptWitness;
                if (finalScriptWitness && finalScriptWitness.length > 0) {
                    // Validate that the finalScriptWitness is not empty (and not just the initial value, without the tapKeySig)
                    if (finalScriptWitness.toString('hex') === '0141') {
                        throw new InvalidArgumentError(`Invalid signature - no taproot signature present on the finalScriptWitness`);
                    }
                }
                else {
                    throw new InvalidArgumentError(`Invalid signature - no finalScriptWitness`);
                }
            }
        });
        // verify signatures valid, so that the psbt is signed by the item owner
        // if (
        //   (await FullnodeRPC.analyzepsbt(req.signedListingPSBTBase64))?.inputs[0]
        //     ?.is_final !== true
        // ) {
        //   throw new InvalidArgumentError(`Invalid signature`);
        // }
        // verify that the input's sellerOrdAddress is the same as the sellerOrdAddress of the utxo
        if (psbt.inputCount !== 1) {
            throw new InvalidArgumentError(`Invalid number of inputs`);
        }
        const utxoOutput = generateTxidFromHash(psbt.txInputs[0].hash) +
            ':' +
            psbt.txInputs[0].index;
        // verify that the ordItem is the same as the seller wants
        const ordItem = await itemProvider.getTokenByOutput(utxoOutput);
        if (ordItem?.id !== req.tokenId) {
            throw new InvalidArgumentError(`Invalid tokenId`);
        }
        // verify that the ordItem's selling price matches the output value with makerFeeBp
        const output = psbt.txOutputs[0];
        const expectedOutput = getSellerOrdOutputValue(req.price, await feeProvider.getMakerFeeBp(ordItem.owner), ordItem.outputValue);
        if (output.value !== expectedOutput) {
            throw new InvalidArgumentError(`Invalid price`);
        }
        // verify that the output address is the same as the seller's receive address
        if (output.address !== req.sellerReceiveAddress) {
            throw new InvalidArgumentError(`Invalid sellerReceiveAddress`);
        }
        // verify that the seller address is a match
        const sellerAddressFromPSBT = bitcoin.address.fromOutputScript(bitcoin.Transaction.fromHex(
        // await FullnodeRPC.getrawtransaction(
        //   generateTxidFromHash(psbt.txInputs[0].hash),
        // ),
        await getTxHex(generateTxidFromHash(psbt.txInputs[0].hash))).outs[psbt.txInputs[0].index].script, network);
        if (ordItem?.owner !== sellerAddressFromPSBT) {
            throw new InvalidArgumentError(`Invalid seller address`);
        }
    }
    SellerSigner.verifySignedListingPSBTBase64 = verifySignedListingPSBTBase64;
})(SellerSigner || (SellerSigner = {}));
export var BuyerSigner;
(function (BuyerSigner) {
    async function checkDummyUtxos(addressUtxos, itemProvider) {
        let dummyCount = 0;
        for (const utxoFromMempool of addressUtxos) {
            if (utxoFromMempool.value == DUMMY_UTXO_VALUE) {
                if (await doesUtxoContainInscription(utxoFromMempool, itemProvider)) {
                    continue;
                }
                dummyCount++;
            }
            if (dummyCount == 2)
                break;
        }
        return dummyCount == 2;
    }
    BuyerSigner.checkDummyUtxos = checkDummyUtxos;
    async function selectDummyUTXOs(utxos, itemProvider) {
        const result = [];
        for (const utxo of utxos) {
            if (utxo.value == DUMMY_UTXO_VALUE) {
                if (await doesUtxoContainInscription(utxo, itemProvider)) {
                    continue;
                }
                result.push((await mapUtxos([utxo]))[0]);
                if (result.length === 2)
                    return result;
            }
        }
        return null;
    }
    BuyerSigner.selectDummyUTXOs = selectDummyUTXOs;
    async function selectPaymentUTXOs(utxos, amount, // amount is expected total output (except tx fee)
    vinsLength, voutsLength, feeRateTier, feeRate, itemProvider, platFee = PLATFORM_FEE, dummyUtxos = [], dummyValue = DUMMY_UTXO_VALUE) {
        amount += dummyValue * 4 + platFee;
        const selectedUtxos = [];
        let selectedAmount = dummyValue * 2;
        // Sort descending by value, and filter out dummy utxos
        utxos = utxos.sort((a, b) => b.value - a.value);
        let gasFee = 0;
        for (const utxo of utxos) {
            // Never spend a utxo that contains an inscription for cardinal purposes
            if (await doesUtxoContainInscription(utxo, itemProvider)) {
                continue;
            }
            if (dummyUtxos.length > 0 &&
                dummyUtxos.filter((x) => x.txid == utxo.txid && x.vout == utxo.vout)
                    .length == 1) {
                continue;
            }
            if (utxo.value < dummyValue) {
                continue;
            }
            selectedUtxos.push(utxo);
            selectedAmount += utxo.value;
            const recommendedFeeRate = feeRate == 0 ? await getFees(feeRateTier) : feeRate;
            const fee = calculateTxFeeWithRate(recommendedFeeRate, vinsLength + selectedUtxos.length, voutsLength);
            // const fee = await calculateTxBytesFee(
            //   vinsLength + selectedUtxos.length,
            //   voutsLength,
            //   feeRateTier,
            // );
            gasFee = fee;
            if (selectedAmount >= amount + fee) {
                break;
            }
        }
        if (selectedAmount < amount + gasFee) {
            throw new InvalidArgumentError(`Not enough cardinal spendable funds or too many dust utxo.
Address has:  ${satToBtc(selectedAmount)} BTC
Needed:       ${satToBtc(amount + gasFee)} BTC`);
        }
        return await mapUtxos(selectedUtxos);
    }
    BuyerSigner.selectPaymentUTXOs = selectPaymentUTXOs;
    async function doesUtxoContainInscription(utxo, itemProvider) {
        // If it's confirmed, we check the indexing db for that output
        if (utxo.status.confirmed) {
            try {
                return ((await itemProvider.getTokenByOutput(`${utxo.txid}:${utxo.vout}`)) !==
                    null);
            }
            catch (err) {
                return true; // if error, we pretend that the utxo contains an inscription for safety
            }
        }
        // if it's not confirmed, we search the input script for the inscription
        const tx = //await getTx(utxo.txid);
         await ProxyRPC.getrawtransactionVerbose(utxo.txid);
        let foundInscription = false;
        console.log('check txid:', utxo.txid);
        for (const input of tx.vin) {
            // if ((await getTxStatus(input.txid)).confirmed === false) {
            //   return true; // to error on the safer side, and treat this as possible to have a inscription
            // }
            if ((await ProxyRPC.getrawtransactionVerbose(input.txid)).confirmations ===
                0) {
                return true; // to error on the safer side, and treat this as possible to have a inscription
            }
            const previousOutput = `${input.txid}:${input.vout}`;
            try {
                if ((await itemProvider.getTokenByOutput(previousOutput)) !== null) {
                    foundInscription = true;
                    return foundInscription;
                }
            }
            catch (err) {
                return true; // if error, we pretend that the utxo contains an inscription for safety
            }
        }
        return foundInscription;
    }
    async function getSellerInputAndOutput(listing) {
        const [ordinalUtxoTxId, ordinalUtxoVout] = listing.seller.ordItem.output.split(':');
        let tx = null;
        if (listing.buyerTx) {
            tx = bitcoin.Transaction.fromHex(listing.buyerTx);
        }
        else {
            tx = bitcoin.Transaction.fromHex(await ProxyRPC.getrawtransaction(ordinalUtxoTxId));
        }
        // No need to add this witness if the seller is using taproot
        if (!listing.seller.tapInternalKey) {
            for (let outputIndex = 0; outputIndex < tx.outs.length; outputIndex++) {
                try {
                    tx.setWitness(outputIndex, []);
                }
                catch { }
            }
        }
        const sellerInput = {
            hash: ordinalUtxoTxId,
            index: parseInt(ordinalUtxoVout),
            nonWitnessUtxo: tx.toBuffer(),
            // No problem in always adding a witnessUtxo here
            witnessUtxo: tx.outs[parseInt(ordinalUtxoVout)],
        };
        // If taproot is used, we need to add the internal key
        if (listing.seller.tapInternalKey) {
            sellerInput.tapInternalKey = toXOnly(tx.toBuffer().constructor(listing.seller.tapInternalKey, 'hex'));
        }
        const ret = {
            sellerInput,
            sellerOutput: {
                address: listing.seller.sellerReceiveAddress,
                value: getSellerOrdOutputValue(listing.seller.price, (listing.seller.makerFeeBp || 0) + (listing.seller.chargeFeeBp || 0), listing.seller.ordItem.outputValue),
            },
        };
        return ret;
    }
    async function generateUnsignedBuyingPSBTBase64(listing) {
        const psbt = new bitcoin.Psbt({ network });
        if (!listing.buyer ||
            !listing.buyer.buyerAddress ||
            !listing.buyer.buyerTokenReceiveAddress) {
            throw new InvalidArgumentError('Buyer address is not set');
        }
        if (listing.buyer.buyerDummyUTXOs?.length !== 2 ||
            !listing.buyer.buyerPaymentUTXOs) {
            throw new InvalidArgumentError('Buyer address has not enough utxos');
        }
        let totalInput = 0;
        let sighashType = bitcoin.Transaction.SIGHASH_ALL;
        if (listing.isBidder) {
            sighashType =
                bitcoin.Transaction.SIGHASH_SINGLE |
                    bitcoin.Transaction.SIGHASH_ANYONECANPAY;
        }
        // Add two dummyUtxos
        for (const dummyUtxo of listing.buyer.buyerDummyUTXOs) {
            const input = {
                hash: dummyUtxo.txid,
                index: dummyUtxo.vout,
                nonWitnessUtxo: dummyUtxo.tx.toBuffer(),
                sighashType: sighashType,
            };
            const p2shInputRedeemScript = {};
            const p2shInputWitnessUTXO = {};
            if (isP2SHAddress(listing.buyer.buyerAddress, network)) {
                const redeemScript = bitcoin.payments.p2wpkh({
                    pubkey: Buffer.from(listing.buyer.buyerPublicKey, 'hex'),
                }).output;
                const p2sh = bitcoin.payments.p2sh({
                    redeem: { output: redeemScript },
                });
                p2shInputWitnessUTXO.witnessUtxo = {
                    script: p2sh.output,
                    value: dummyUtxo.value,
                };
                p2shInputRedeemScript.redeemScript = p2sh.redeem?.output;
            }
            else {
                input.witnessUtxo = dummyUtxo.tx.outs[dummyUtxo.vout];
                input.tapInternalKey = toXOnly(Buffer.from(listing.buyer.buyerPublicKey, 'hex'));
            }
            psbt.addInput({
                ...input,
                ...p2shInputWitnessUTXO,
                ...p2shInputRedeemScript,
            });
            totalInput += dummyUtxo.value;
        }
        const { sellerInput, sellerOutput } = await getSellerInputAndOutput(listing);
        psbt.addInput(sellerInput);
        totalInput += listing.seller.ordItem.outputValue;
        // Add payment utxo inputs
        for (const utxo of listing.buyer.buyerPaymentUTXOs) {
            const input = {
                hash: utxo.txid,
                index: utxo.vout,
                nonWitnessUtxo: utxo.tx.toBuffer(),
                sighashType: sighashType,
            };
            const p2shInputWitnessUTXOUn = {};
            const p2shInputRedeemScriptUn = {};
            if (isP2SHAddress(listing.buyer.buyerAddress, network)) {
                const redeemScript = bitcoin.payments.p2wpkh({
                    pubkey: Buffer.from(listing.buyer.buyerPublicKey, 'hex'),
                }).output;
                const p2sh = bitcoin.payments.p2sh({
                    redeem: { output: redeemScript },
                });
                p2shInputWitnessUTXOUn.witnessUtxo = {
                    script: p2sh.output,
                    value: utxo.value,
                };
                p2shInputRedeemScriptUn.redeemScript = p2sh.redeem?.output;
            }
            else {
                input.witnessUtxo = utxo.tx.outs[utxo.vout];
                input.tapInternalKey = toXOnly(Buffer.from(listing.buyer.buyerPublicKey, 'hex'));
                // input.redeemScript = toXOnly(
                //   Buffer.from(listing.buyer.buyerPublicKey!, 'hex'),
                // );
            }
            psbt.addInput({
                ...input,
                ...p2shInputWitnessUTXOUn,
                ...p2shInputRedeemScriptUn,
            });
            totalInput += utxo.value;
        }
        // Add dummy output
        psbt.addOutput({
            address: listing.buyer.buyerAddress,
            value: listing.buyer.buyerDummyUTXOs[0].value +
                listing.buyer.buyerDummyUTXOs[1].value,
            // + Number(listing.seller.ordItem.location.split(':')[2]),
        });
        // Add ordinal output
        psbt.addOutput({
            address: listing.buyer.buyerTokenReceiveAddress,
            value: listing.seller.ordItem.outputValue,
        });
        psbt.addOutput(sellerOutput);
        // Create a platform fee output
        // let platformFeeValue = Math.floor(
        //   (listing.seller.price *
        //     (listing.buyer.takerFeeBp + listing.seller.makerFeeBp)) /
        //     10000,
        // );
        // platformFeeValue =
        //   platformFeeValue > DUMMY_UTXO_MIN_VALUE ? platformFeeValue : 0;
        if (listing.buyer.platFee > 0) {
            psbt.addOutput({
                address: listing.buyer.platAddress || PLATFORM_FEE_ADDRESS,
                value: listing.buyer.platFee,
            });
        }
        const makeBp = listing.seller.makerFeeBp || 0;
        if (makeBp > 0) {
            psbt.addOutput({
                address: listing.seller.makerAddress,
                value: (listing.seller.price * makeBp) / 100,
            });
        }
        const chargeFeeBp = listing.seller.chargeFeeBp || 0;
        if (chargeFeeBp > 0) {
            psbt.addOutput({
                address: listing.seller.chargeAddress,
                value: (listing.seller.price * chargeFeeBp) / 100,
            });
        }
        // Create two new dummy utxo output for the next purchase
        psbt.addOutput({
            address: listing.buyer.buyerAddress,
            value: DUMMY_UTXO_VALUE,
        });
        psbt.addOutput({
            address: listing.buyer.buyerAddress,
            value: DUMMY_UTXO_VALUE,
        });
        let fee = calculateTxBytesFeeWithRate(psbt.txInputs.length, psbt.txOutputs.length + 1, listing.buyer.feeRate);
        // const fee = await calculateTxBytesFee(
        //   psbt.txInputs.length,
        //   psbt.txOutputs.length, // already taken care of the exchange output bytes calculation
        //   listing.buyer.feeRateTier,
        // );
        const totalOutput = psbt.txOutputs.reduce((partialSum, a) => partialSum + a.value, 0);
        const changeValue = totalInput - totalOutput - fee;
        if (changeValue < 0) {
            throw new Error(`Your wallet address doesn't have enough funds to buy this inscription.
Price:      ${satToBtc(listing.seller.price)} BTC
Fee:        ${satToBtc(fee)}BTC
Required(totalOutput+fee):   ${satToBtc(totalOutput + fee)} BTC
Missing:    ${satToBtc(-changeValue)} BTC`);
        }
        // Change utxo
        if (changeValue > DUMMY_UTXO_MIN_VALUE) {
            psbt.addOutput({
                address: listing.buyer.buyerAddress,
                value: changeValue,
            });
        }
        else {
            fee += changeValue;
        }
        listing.buyer.unsignedBuyingPSBTBase64 = psbt.toBase64();
        listing.buyer.unsignedBuyingPSBTInputSize = psbt.data.inputs.length;
        listing.buyer.spend = fee + listing.seller.price + listing.buyer.platFee;
        return listing;
    }
    BuyerSigner.generateUnsignedBuyingPSBTBase64 = generateUnsignedBuyingPSBTBase64;
    function mergeSignedBuyingPSBTBase64(signedListingPSBTBase64, signedBuyingPSBTBase64) {
        const sellerSignedPsbt = bitcoin.Psbt.fromBase64(signedListingPSBTBase64);
        const buyerSignedPsbt = bitcoin.Psbt.fromBase64(signedBuyingPSBTBase64);
        buyerSignedPsbt.data.globalMap.unsignedTx.tx.ins[BUYING_PSBT_SELLER_SIGNATURE_INDEX] = sellerSignedPsbt.data.globalMap.unsignedTx.tx.ins[0];
        buyerSignedPsbt.data.inputs[BUYING_PSBT_SELLER_SIGNATURE_INDEX] =
            sellerSignedPsbt.data.inputs[0];
        return buyerSignedPsbt.toBase64();
    }
    BuyerSigner.mergeSignedBuyingPSBTBase64 = mergeSignedBuyingPSBTBase64;
    function verifyDummyUTXOAndGetValue(psbt, index) {
        const dummyUtxoInput = psbt.data.inputs[index];
        if (dummyUtxoInput.witnessUtxo) {
            return dummyUtxoInput.witnessUtxo.value;
        }
        else if (dummyUtxoInput.nonWitnessUtxo) {
            // utxo can be a nonWitness if it is legacy
            const dummyUtxo = bitcoin.Transaction.fromBuffer(dummyUtxoInput.nonWitnessUtxo);
            const dummyOutIndex = psbt.txInputs[index].index;
            return dummyUtxo.outs[dummyOutIndex].value;
        }
        else {
            throw new InvalidArgumentError(`Empty nonWitnessUtxo or witnessUtxo`);
        }
    }
    async function verifySignedBuyingPSBTBase64(req, feeProvider, itemProvider) {
        const psbt = bitcoin.Psbt.fromBase64(req.signedBuyingPSBTBase64, {
            network,
        });
        // verify all the signatures are valid from the buyer except the seller input
        // const analyzepsbtInputs = (
        //   await FullnodeRPC.analyzepsbt(req.signedBuyingPSBTBase64)
        // ).inputs;
        // for (let i = 0; i < analyzepsbtInputs.length; i++) {
        //   if (
        //     i !== BUYING_PSBT_SELLER_SIGNATURE_INDEX &&
        //     analyzepsbtInputs[i].is_final !== true
        //   ) {
        //     throw new InvalidArgumentError('Invalid signature');
        //   }
        //   if (!analyzepsbtInputs[i].has_utxo) {
        //     throw new InvalidArgumentError('Missing utxo');
        //   }
        // }
        // verify that we are paying to the correct buyerTokenReceiveAddress
        const buyerTokenReceiveAddress = psbt.txOutputs[BUYING_PSBT_BUYER_RECEIVE_INDEX].address;
        if (buyerTokenReceiveAddress !== req.buyerTokenReceiveAddress) {
            throw new InvalidArgumentError('buyerTokenReceiveAddress mismatch');
        }
        // verify the ordItem is still owned by the seller and the buyer is buying the right item
        const ordCurrentOutput = generateTxidFromHash(psbt.txInputs[BUYING_PSBT_SELLER_SIGNATURE_INDEX].hash) +
            ':' +
            psbt.txInputs[BUYING_PSBT_SELLER_SIGNATURE_INDEX].index;
        // verify that the ordItem is the same as the seller wants
        const ordItemFromSignedBuyingPSBT = await itemProvider.getTokenByOutput(ordCurrentOutput);
        const ordItemFromReq = await itemProvider.getTokenById(req.tokenId);
        if (!ordItemFromSignedBuyingPSBT || !ordItemFromReq) {
            throw new InvalidArgumentError('ordItem not found from psbt or req');
        }
        if (ordItemFromReq.location !== ordItemFromSignedBuyingPSBT.location) {
            throw new InvalidArgumentError('ordItem location mismatch');
        }
        // verify the seller is getting paid the correct amount
        const priceSetByBuyerPSBT = psbt.txOutputs[BUYING_PSBT_SELLER_SIGNATURE_INDEX].value;
        if (!ordItemFromReq?.listedPrice) {
            throw new InvalidArgumentError('Invalid ordItem listedPrice');
        }
        if (ordItemFromReq.listedMakerFeeBp === undefined) {
            throw new InvalidArgumentError('Invalid ordItem listedMakerFeeBp');
        }
        const expectedSellerReceiveValue = getSellerOrdOutputValue(ordItemFromReq.listedPrice, ordItemFromReq.listedMakerFeeBp, ordItemFromReq.outputValue);
        if (priceSetByBuyerPSBT !== expectedSellerReceiveValue) {
            throw new InvalidArgumentError('Invalid ordItem listedPrice');
        }
        // verify we are paying to the correct seller receive address
        const sellerReceiveAddress = psbt.txOutputs[BUYING_PSBT_SELLER_SIGNATURE_INDEX].address;
        if (sellerReceiveAddress !== ordItemFromReq.listedSellerReceiveAddress) {
            throw new InvalidArgumentError('Invalid seller receive address');
        }
        // verify that the buyer is getting the buyer receive token
        if (psbt.txOutputs[BUYING_PSBT_BUYER_RECEIVE_INDEX].value !==
            ORDINALS_POSTAGE_VALUE) {
            throw new InvalidArgumentError('Invalid buyer token receive output postage value');
        }
        if (psbt.txOutputs[BUYING_PSBT_BUYER_RECEIVE_INDEX].address !==
            req.buyerTokenReceiveAddress) {
            throw new InvalidArgumentError('Invalid buyer token receive address');
        }
        // verify the the platform is getting paid maker and taker fees
        const platformFeeValueExpected = Math.floor((ordItemFromReq.listedPrice *
            (ordItemFromReq.listedMakerFeeBp +
                (await feeProvider.getTakerFeeBp(req.buyerAddress)))) /
            10000);
        if (platformFeeValueExpected > DUMMY_UTXO_MIN_VALUE) {
            const platformFeeValue = psbt.txOutputs[BUYING_PSBT_PLATFORM_FEE_INDEX].value;
            if (platformFeeValue !== platformFeeValueExpected) {
                throw new InvalidArgumentError(`Invalid platform fee, expect ${platformFeeValueExpected}, but got ${platformFeeValue}`);
            }
            if (psbt.txOutputs[BUYING_PSBT_PLATFORM_FEE_INDEX].address !==
                PLATFORM_FEE_ADDRESS) {
                throw new InvalidArgumentError('Invalid platform fee address');
            }
        }
        return {
            newOutputOffset: 0, // based on 2-dummy algo, the new outputOffset is 0
        };
    }
    BuyerSigner.verifySignedBuyingPSBTBase64 = verifySignedBuyingPSBTBase64;
    //return unsigned psbt
    async function sendInscription(inscription, from, publicKey, //hex
    to, itemCheck) {
        const addressUtxos = await getAddressUtxos(from);
        const recommendFees = await getRecommendedFees();
        const fee = calculateTxFeeWithRate(recommendFees.hourFee, 2, 2);
        const payUtxos = await selectPaymentUTXOs(addressUtxos, fee, 2, 2, '', recommendFees.hourFee, itemCheck, 0, [], 0);
        const psbt = new bitcoin.Psbt({ network: network });
        const sighashType = bitcoin.Transaction.SIGHASH_ALL;
        const [ordinalUtxoTxId, ordinalUtxoVout] = inscription.output.split(':');
        const tx = bitcoin.Transaction.fromHex(await ProxyRPC.getrawtransaction(inscription.output.split(':')[0]));
        const input = {
            hash: ordinalUtxoTxId,
            index: parseInt(ordinalUtxoVout),
            nonWitnessUtxo: tx.toBuffer(),
            // No problem in always adding a witnessUtxo here
            witnessUtxo: tx.outs[parseInt(ordinalUtxoVout)],
            sighashType: sighashType,
        };
        // If taproot is used, we need to add the internal key
        input.tapInternalKey = toXOnly(tx.toBuffer().constructor(publicKey, 'hex'));
        psbt.addInput(input);
        let totalInput = 0;
        for (const utxo of payUtxos) {
            const input = {
                hash: utxo.txid,
                index: utxo.vout,
                nonWitnessUtxo: utxo.tx.toBuffer(),
                sighashType: sighashType,
            };
            input.witnessUtxo = utxo.tx.outs[utxo.vout];
            input.tapInternalKey = toXOnly(Buffer.from(publicKey, 'hex'));
            psbt.addInput({
                ...input,
            });
            totalInput += utxo.value;
        }
        psbt.addOutput({
            address: to,
            value: inscription.outputValue,
        });
        if (totalInput > fee)
            psbt.addOutput({
                address: from,
                value: totalInput - fee,
            });
        return psbt;
    }
    BuyerSigner.sendInscription = sendInscription;
    async function generateUnsignedCreateDummyUtxoPSBTBase64(address, buyerPublicKey, unqualifiedUtxos, feeRateTier, feeRate, itemProvider) {
        const psbt = new bitcoin.Psbt({ network });
        const [mappedUnqualifiedUtxos, recommendedFee] = await Promise.all([
            mapUtxos(unqualifiedUtxos),
            feeRate == 0 ? getFees(feeRateTier) : feeRate,
        ]);
        // Loop the unqualified utxos until we have enough to create a dummy utxo
        let totalValue = 0;
        let paymentUtxoCount = 0;
        for (const utxo of mappedUnqualifiedUtxos) {
            if (await doesUtxoContainInscription(utxo, itemProvider)) {
                continue;
            }
            const input = {
                hash: utxo.txid,
                index: utxo.vout,
                nonWitnessUtxo: utxo.tx.toBuffer(),
            };
            if (isP2SHAddress(address, network)) {
                const redeemScript = bitcoin.payments.p2wpkh({
                    pubkey: Buffer.from(buyerPublicKey, 'hex'),
                }).output;
                const p2sh = bitcoin.payments.p2sh({
                    redeem: { output: redeemScript },
                });
                input.redeemScript = p2sh.redeem?.output;
            }
            else {
                input.tapInternalKey = toXOnly(Buffer.from(buyerPublicKey, 'hex'));
            }
            input.witnessUtxo = utxo.tx.outs[utxo.vout];
            psbt.addInput(input);
            totalValue += utxo.value;
            paymentUtxoCount += 1;
            const fees = calculateTxBytesFeeWithRate(paymentUtxoCount, 2, // 2-dummy outputs
            recommendedFee);
            if (totalValue >= DUMMY_UTXO_VALUE * 2 + fees) {
                break;
            }
        }
        const finalFees = calculateTxBytesFeeWithRate(paymentUtxoCount, 2, // 2-dummy outputs
        recommendedFee);
        const changeValue = totalValue - DUMMY_UTXO_VALUE * 2 - finalFees;
        // We must have enough value to create a dummy utxo and pay for tx fees
        if (changeValue < 0) {
            throw new InvalidArgumentError(`You might have pending transactions or not enough fund`);
        }
        psbt.addOutput({
            address,
            value: DUMMY_UTXO_VALUE,
        });
        psbt.addOutput({
            address,
            value: DUMMY_UTXO_VALUE,
        });
        // to avoid dust
        // if (changeValue > DUMMY_UTXO_MIN_VALUE)
        {
            psbt.addOutput({
                address,
                value: changeValue,
            });
        }
        return psbt.toBase64();
    }
    BuyerSigner.generateUnsignedCreateDummyUtxoPSBTBase64 = generateUnsignedCreateDummyUtxoPSBTBase64;
})(BuyerSigner || (BuyerSigner = {}));
//# sourceMappingURL=signer.js.map
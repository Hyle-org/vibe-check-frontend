import { AccountData, DirectSecp256k1HdWallet, Registry } from "@cosmjs/proto-signing";
import { SigningStargateClient, defaultRegistryTypes } from "@cosmjs/stargate";
import { TxRaw } from "cosmjs-types/cosmos/tx/v1beta1/tx";

// A message type auto-generated from .proto files using ts-proto. @cosmjs/stargate ships some
// common types but don't rely on those being available. You need to set up your own code generator
// for the types you care about. How this is done should be documented, but is not yet:
// https://github.com/cosmos/cosmjs/issues/640
import { MsgExecuteStateChanges, MsgRegisterContract } from "./proto/tx.ts";
import { hashBalance } from "./CairoHash";
import { getNetworkApiUrl } from "./network.ts";

const mnemonic =
    "surround miss nominee dream gap cross assault thank captain prosper drop duty group candy wealth weather scale put";

let client: SigningStargateClient;
let firstAccount: AccountData;

export async function setupCosmos(address: string) {
    const wallet = await DirectSecp256k1HdWallet.fromMnemonic(mnemonic, { prefix: "hyle" });
    [firstAccount] = await wallet.getAccounts();

    const rpcEndpoint = address;
    client = await SigningStargateClient.connectWithSigner(rpcEndpoint, wallet, {
        registry: new Registry([
            ...defaultRegistryTypes,
            ["/hyle.zktx.v1.MsgExecuteStateChanges", MsgExecuteStateChanges],
            ["/hyle.zktx.v1.MsgRegisterContract", MsgRegisterContract],
        ]),
    });
}

function uint8ArrayToBase64(array: Uint8Array): string {
    if (typeof Buffer !== "undefined") return Buffer.from(array).toString("base64");
    // Work around call stack issues with large arrays
    const CHUNK_SIZE = 0x8000;
    let index = 0;
    const length = array.length;
    let result = "";
    while (index < length) {
        const end = Math.min(length, index + CHUNK_SIZE);
        result += String.fromCharCode.apply(null, array.slice(index, end));
        index = end;
    }
    return btoa(result);
}

export async function broadcastTx(ecdsaProof: string, smileProof: any, erc20Proof: Uint8Array) {
    console.log(ecdsaProof)
    console.log(smileProof)
    console.log(erc20Proof)
    const msgAny = {
        typeUrl: "/hyle.zktx.v1.MsgExecuteStateChanges",
        value: {
            stateChanges: [
                {
                    contractName: "ecdsa_secp256r1",
                    proof: window.btoa(ecdsaProof),
                },{
                    contractName: "smile_token",
                    proof: uint8ArrayToBase64(erc20Proof),
                },{
                    contractName: "smile",
                    proof: uint8ArrayToBase64(smileProof.proof),
                },
            ],
        },
    };
    const fee = {
        amount: [
            {
                denom: "hyle",
                amount: "2000",
            },
        ],
        gas: "180000", // 180k
    };
    const signedTx = await client.sign(firstAccount.address, [msgAny], fee, "", {
        accountNumber: 1,
        sequence: 1,
        chainId: "hyle",
    });
    // For now our transactions are always included.
    return await client.broadcastTx(Uint8Array.from(TxRaw.encode(signedTx).finish()));
}

export async function checkTxStatus(hash: string) {
    const resp = await client.getTx(hash);
    if (resp?.code !== 0) {
        return {
            status: "failed",
            error: resp?.rawLog || "unknown error",
        };
    }
    return {
        status: "success",
    };
}

export async function ensureContractsRegistered() {
    const checkExists = await fetch(`${getNetworkApiUrl()}/hyle/zktx/v1/contract/smile_token`);
    if ((await checkExists.json()).contract.program_id == "1Q==") {
        return;
    }

    const initialBalanceHash = hashBalance([
        {
            name: "faucet",
            amount: 1000000,
        },
    ]);
    // Creation of smile_token contract
    let msgAny = {
        typeUrl: "/hyle.zktx.v1.MsgRegisterContract",
        value: {
            owner: firstAccount.address,
            verifier: "cairo",
            contractName: "smile_token",
            programId: new Uint8Array([213]),
            stateDigest: new Uint8Array(initialBalanceHash.split("").map((x) => x.charCodeAt(0))),
        } as MsgRegisterContract,
    };
    const fee = {
        amount: [
            {
                denom: "hyle",
                amount: "2000",
            },
        ],
        gas: "180000", // 180k
    };
    let signedTx = await client.sign(firstAccount.address, [msgAny], fee, "", {
        accountNumber: 1,
        sequence: 1,
        chainId: "hyle",
    });
    client.broadcastTx(Uint8Array.from(TxRaw.encode(signedTx).finish()));

    // Creation for smile contract
    msgAny = {
        typeUrl: "/hyle.zktx.v1.MsgRegisterContract",
        value: {
            owner: firstAccount.address,
            verifier: "cairo",
            contractName: "smile",
            programId: new Uint8Array([123]),
            stateDigest: new Uint8Array("666".split("").map((x) => x.charCodeAt(0))),
        } as MsgRegisterContract,
    };
    signedTx = await client.sign(firstAccount.address, [msgAny], fee, "", {
        accountNumber: 1,
        sequence: 2,
        chainId: "hyle",
    });
    client.broadcastTx(Uint8Array.from(TxRaw.encode(signedTx).finish()));

    // Creation of ECDSA contract
    const b64vKey =
        "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";
    const vKey = Uint8Array.from(Buffer.from(b64vKey, "base64"));
    msgAny = {
        typeUrl: "/hyle.zktx.v1.MsgRegisterContract",
        value: {
            owner: firstAccount.address,
            verifier: "noir",
            contractName: "ecdsa_secp256r1",
            programId: vKey,
            stateDigest: new Uint8Array([0, 0, 0, 0]), // TODO: add Nonce in digest?
        } as MsgRegisterContract,
    };
    signedTx = await client.sign(firstAccount.address, [msgAny], fee, "", {
        accountNumber: 1,
        sequence: 3,
        chainId: "hyle",
    });
    await client.broadcastTx(Uint8Array.from(TxRaw.encode(signedTx).finish()));
}

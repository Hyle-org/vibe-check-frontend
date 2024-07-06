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

export async function broadcastTx(ecdsaProof: string, smileProof: Uint8Array, erc20Proof: Uint8Array) {
    const msgAny = {
        typeUrl: "/hyle.zktx.v1.MsgExecuteStateChanges",
        value: {
            stateChanges: [
                {
                    contractName: "ecdsa_secp256r1",
                    proof: window.btoa(ecdsaProof),
                },
                {
                    contractName: "smile_token",
                    proof: uint8ArrayToBase64(erc20Proof),
                },
                {
                    contractName: "smile",
                    proof: uint8ArrayToBase64(smileProof),
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

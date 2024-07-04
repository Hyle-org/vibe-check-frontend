import { BarretenbergBackend, CompiledCircuit } from "@noir-lang/backend_barretenberg";
import { Noir } from "@noir-lang/noir_js";
import webAuthnCircuit from "./webauthn.json";
import { CairoArgs } from "./CairoHash";

import * as crypto from "crypto";

// Circuit tools setup
// Preloaded so the server starts downloading early and minimize latency.
const backend = new BarretenbergBackend(webAuthnCircuit as CompiledCircuit, { threads: 4 });
const noir = new Noir(webAuthnCircuit as CompiledCircuit, backend);
noir.generateProof({}).catch((_) => {
    import("@aztec/bb.js");
});

export const computeIdentity = (pub_key_x: number[], pub_key_y: number[]) => {
    if (pub_key_x.length !== 32 || pub_key_y.length !== 32) {
        throw new Error("pub_key_x and pub_key_y size need to be 32bytes.");
    }
    const publicKey = Buffer.concat([Buffer.from(pub_key_x), Buffer.from(pub_key_y)]);
    const hash = crypto.createHash("sha256").update(publicKey).digest();
    const result = hash.slice(-20);
    const hexResult = Array.from(result).map((byte) => byte.toString(16).padStart(2, "0"));

    return hexResult.join("") + ".ecdsa_secp256r1";
};

export const proveECDSA = async (webAuthnValues: Record<string, any>) => {
    const identity = computeIdentity(webAuthnValues.pub_key_x, webAuthnValues.pub_key_y);
    const noirInput = {
        // TODO: remove generic values
        version: 1,
        initial_state_len: 4,
        initial_state: [0, 0, 0, 0],
        next_state_len: 4,
        next_state: [0, 0, 0, 0],
        identity_len: 56,
        identity: identity,
        tx_hash_len: 43,
        tx_hash: webAuthnValues.challenge,
        program_outputs: {
            authenticator_data: webAuthnValues.authenticator_data,
            client_data_json_len: webAuthnValues.client_data_json_len,
            client_data_json: webAuthnValues.client_data_json,
            signature: webAuthnValues.signature,
            pub_key_x: webAuthnValues.pub_key_x,
            pub_key_y: webAuthnValues.pub_key_y,
        },
    };

    // Proving
    const proof = await noir.generateProof(noirInput);
    return JSON.stringify({
        publicInputs: proof.publicInputs,
        proof: Array.from(proof.proof),
    });
};

export type CairoSmileArgs = {
    identity: number[];
    image: number[];
};

export const runSmile = async (args: CairoSmileArgs): Promise<number> => {
    const worker = new Worker(new URL("./CairoRunner.ts", import.meta.url), {
        type: "module",
    });
    return await new Promise((resolve, reject) => {
        worker.onerror = (e) => {
            console.error(e);
            worker.terminate();
            reject(e);
        };
        worker.onmessage = (e) => {
            resolve(e.data.vibe);
            worker.terminate();
        };
        worker.postMessage(["run-smile", args]);
    });
};

export const proveERC20Transfer = async (args: CairoArgs): Promise<Uint8Array> => {
    const worker = new Worker(new URL("./CairoRunner.ts", import.meta.url), {
        type: "module",
    });
    return await new Promise((resolve, reject) => {
        worker.onerror = (e) => {
            console.error(e);
            worker.terminate();
            reject(e);
        };
        worker.onmessage = (e) => {
            resolve(e.data.proof);
            worker.terminate();
        };
        worker.postMessage(["run-erc20", args]);
        worker.postMessage(["prove-erc20"]);
    });
};

export const proveSmile = async (args: string) => {
    const worker = new Worker(new URL("./CairoRunner.ts", import.meta.url), {
        type: "module",
    });
    return await new Promise((resolve, reject) => {
        worker.onerror = (e) => {
            console.error(e);
            worker.terminate();
            reject(e);
        };
        worker.onmessage = (e) => {
            resolve(e);
            worker.terminate();
        };
        worker.postMessage(["run-smile", args]);
        worker.postMessage(["prove-smile"]);
    });
};

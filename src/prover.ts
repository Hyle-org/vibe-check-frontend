import { BarretenbergBackend, CompiledCircuit } from "@noir-lang/backend_barretenberg";
import { Noir } from "@noir-lang/noir_js";
import webAuthnCircuit from "./webauthn.json";
import { CairoArgs, CairoSmileArgs } from "./CairoHash";
import { getWebAuthnIdentity } from "./webauthn";

// Circuit tools setup
// Preloaded so the server starts downloading early and minimize latency.
const backend = new BarretenbergBackend(webAuthnCircuit as CompiledCircuit, { threads: 4 });
const noir = new Noir(webAuthnCircuit as CompiledCircuit, backend);
noir.generateProof({}).catch((_) => {
    import("@aztec/bb.js");
});

export const proveECDSA = async (webAuthnValues: Record<string, any>) => {
    const noirInput = {
        // TODO: remove generic values
        version: 1,
        initial_state_len: 4,
        initial_state: [0, 0, 0, 0],
        next_state_len: 4,
        next_state: [0, 0, 0, 0],
        identity_len: 56,
        identity: getWebAuthnIdentity(),
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
    console.log(noirInput);
    // Proving
    const proof = await noir.generateProof(noirInput);
    return JSON.stringify({
        publicInputs: proof.publicInputs,
        proof: Array.from(proof.proof),
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

export const runSmile = async (args: CairoSmileArgs): Promise<string> => {
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
            if (e.data[0] === "smile-ran") {
                resolve(e.data[1].output);
            }
            worker.terminate();
        };
        worker.postMessage(["run-smile", args]);
    });
};

export const proveSmile = async (args: CairoSmileArgs): Promise<Uint8Array> => {
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
            if (e.data[0] === "smile-proof") {
                resolve(e.data[1]);
            }
            worker.terminate();
        };
        worker.postMessage(["run-smile", args]);
        worker.postMessage(["prove-smile"]);
    });
};

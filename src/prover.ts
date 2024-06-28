import { BarretenbergBackend } from "@noir-lang/backend_barretenberg";
import { InputMap, Noir } from "@noir-lang/noir_js";

import webAuthnCircuit from "./webauthn.json";
import { ByteArray, CairoArgs } from "./CairoRunner";

export const proveECDSA = async (noirInput: InputMap) => {
    // Circuit tools setup
    const backend = new BarretenbergBackend(webAuthnCircuit, { threads: 4 });
    console.log("hi...");
    // const verificationKey = await backend.getVerificationKey();
    // const verificationKey = await backend.getVerificationKey();
    console.log("...oké");

    /////// LOCAL PROOF CREATION /////////
    // Proving
    const noir = new Noir(webAuthnCircuit, backend);
    const proof = await noir.generateProof(noirInput);
    return JSON.stringify({
        publicInputs: proof.publicInputs,
        proof: Array.from(proof.proof),
    });
};

export const proveSmile = async () => {
    // TODO
    console.warn("Not implemented yet");
    await new Promise((resolve) => setTimeout(resolve, 3000));
    return "";
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
        worker.postMessage(["run", args]);
        worker.postMessage(["prove"]);
    });
};

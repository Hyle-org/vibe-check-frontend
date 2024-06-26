import { BarretenbergBackend } from "@noir-lang/backend_barretenberg";
import { InputMap, Noir } from "@noir-lang/noir_js";

import webAuthnCircuit from "./webauthn.json";

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

export const proveERC20Transfer = async () => {
    const worker = new Worker(new URL("./CairoRunner.ts", import.meta.url), {
        type: "module",
    });
    return await new Promise((resolve) => {
        worker.onmessage = (e) => {
            resolve(e);
            worker.terminate();
        };
        worker.postMessage([
            "run",
            "[2 0 6451042 3 100 0 418430673765 5 0 99 0 6451042 3 0 7168376 5 2553248914692030785942303172119107100577416932040888712016243391667211221779]",
        ]);
        worker.postMessage(["prove"]);
    });
};

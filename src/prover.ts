import { BarretenbergBackend } from '@noir-lang/backend_barretenberg';
import { InputMap, Noir } from '@noir-lang/noir_js';

import webAuthnCircuit from "./webauthn.json";

// Cairo Wasm
import sierra from "./sierra.json";
import runnerInit, { wasm_cairo_run } from "./runner-pkg/cairo_runner.js";
import proverInit, { wasm_prove } from "./prover-pkg/cairo_verifier.js";


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
        proof: Array.from(proof.proof)
    });
}

export const proveSmile = async () => {
    // TODO
    console.warn("Not implemented yet");
    await new Promise((resolve) => setTimeout(resolve, 3000));
    return "";
}

export const proveERC20Transfer = async () => {
    // TODO
    console.warn("Not fully implemented yet");

    await runnerInit();
    await proverInit();

    let program_inputs = "[2 0 6451042 3 100 0 418430673765 5 0 99 0 6451042 3 0 7168376 5 2553248914692030785942303172119107100577416932040888712016243391667211221779]";

    let cairo_run_output = wasm_cairo_run(sierra,program_inputs);
    console.log(cairo_run_output);
    console.log("Starting to prove");
    let proof = wasm_prove(
        new Uint8Array(cairo_run_output.trace),
        new Uint8Array(cairo_run_output.memory),
        JSON.stringify(cairo_run_output.output),
    );
    return JSON.stringify({
        output: cairo_run_output.output,
        proof: Array.from(proof.proof)
    });
}
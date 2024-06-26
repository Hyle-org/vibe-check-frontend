// Cairo Wasm
import sierra from "./sierra.json";
import runnerInit, { wasm_cairo_run } from "./runner-pkg/cairo_runner.js";
import proverInit, { wasm_prove } from "./prover-pkg/cairo_verifier.js";

var cairoRunOutput: any;
var setup: Promise<any>;

export type ByteArray = string;
export type CairoArgs = {
    balances: { name: ByteArray; amount: number }[];
    amount: number;
    from: ByteArray;
    to: ByteArray;
    // Recalculated: hash: string;
};

onmessage = function (e) {
    if (e.data[0] === "run") {
        console.log("Worker started");
        setup = runErc20(e.data[1]);
    } else if (e.data[0] === "prove") {
        proveRun().then((result) => {
            console.log("Worker job done");
            postMessage(result);
        });
    }
};

async function runErc20(programInputs: string) {
    await runnerInit();
    await proverInit();

    console.log("Running with inputs: ", programInputs);
    cairoRunOutput = wasm_cairo_run(sierra, programInputs);
}

async function proveRun() {
    await setup;
    console.log("Proving...");
    let proof = wasm_prove(
        new Uint8Array(cairoRunOutput.trace),
        new Uint8Array(cairoRunOutput.memory),
        cairoRunOutput.output,
    );
    return JSON.stringify({
        output: cairoRunOutput.output,
        proof: proof,
    });
}

// Cairo Wasm
import sierra from "./sierra.json";
import runnerInit, { wasm_cairo_run } from "./runner-pkg/cairo_runner.js";
import proverInit, { wasm_prove } from "./prover-pkg/cairo_verifier.js";
import { ec } from "starknet";

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

export function serByteArray(arr: ByteArray): string {
    if (arr.length > 31) {
        throw new Error("ByteArray too long");
    }
    // Take each letter, encode as hex
    return `0 ${BigInt(
        "0x" +
            arr
                .split("")
                .map((x) => x.charCodeAt(0).toString(16))
                .join(""),
    ).toString()} ${arr.length}`;
}

export function hashBalance(balances: { name: ByteArray; amount: number }[]): string {
    const asString = balances.map((x) => `${serByteArray(x.name)} ${x.amount}`).join(" ");

    return BigInt(["1", ...asString.split(" ")].reduce((acc, x) => ec.starkCurve.pedersen(acc, BigInt(x)))).toString();
}

// exported for testing
export function computeArgs(args: CairoArgs): string {
    const balances = args.balances.map((x) => `${serByteArray(x.name)} ${x.amount}`).join(" ");

    let hash = hashBalance(args.balances);

    return `[${args.balances.length} ${balances} ${args.amount} ${serByteArray(args.from)} ${serByteArray(args.to)} ${hash}]`;
}

onmessage = function (e) {
    if (e.data[0] === "run") {
        console.log("Worker started");
        setup = runErc20(computeArgs(e.data[1]));
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
    return {
        output: cairoRunOutput.output,
        proof: proof,
    };
}

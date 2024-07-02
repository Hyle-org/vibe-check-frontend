// Cairo Wasm
import erc20Sierra from "./erc20-sierra.json";
import smileSierra from "./smile-sierra.json";
import runnerInit, { wasm_cairo_run } from "./runner-pkg/cairo_runner.js";
import proverInit, { wasm_prove } from "./prover-pkg/cairo_verifier.js";
import { ec } from "starknet";
import { CairoSmileArgs } from "./prover.js";

var cairoERC20RunOutput: any;
var cairoSmileRunOutput: any;
var setupErc20: Promise<any>;
var setupSmile: Promise<any>;

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

export function computeSmileArgs(args: CairoSmileArgs): string {
    const identity = "123";

    return `[${identity} ${args.image.join(" ")}]`;
}

const sigmoid = (x: number) => {
    return Math.exp(x) / (Math.exp(x) + 1)
};
  
onmessage = function (e) {
    if (e.data[0] === "run-erc20") {
        console.log("ERC20 Worker started");
        setupErc20 = runErc20(computeArgs(e.data[1]));
    } else if (e.data[0] === "run-smile") {
        console.log("Smile Worker started");
        setupSmile = runSmile(computeSmileArgs(e.data[1])).then(result => {

            console.log(result)
            console.log(result.output)

            // Get last parameter of the serialized HyleOutput struct
            const last = result.output.split(" ").reverse()[0];

            // Result to be processed with a Sigmoid function, so far, it outputs something like 3.65 * 10^75 => too high)
            const res = +last.split("]")[0];
            
            // Send the vibe result to the main thread
            this.postMessage({...result, vibe: res});
/*
            console.log("Start generating proof");

            console.log(result)

            let proof = wasm_prove(
                new Uint8Array(result.trace),
                new Uint8Array(result.memory),
                result.output,
            );

            console.log(proof);
            return {
                output: result.output,
                proof: proof,
            };
            */
        });
    } else if (e.data[0] === "prove-erc20") {
        proveERC20Run().then((result) => {
            console.log("Worker job done");
            postMessage(result);
        });
    } else if (e.data[0] === "prove-smile") {
        proveSmileRun().then((result) => {
            console.log("Worker job done");
            postMessage(result);
        });
    }
};

async function runErc20(programInputs: string) {
    await runnerInit();
    await proverInit();

    cairoERC20RunOutput = wasm_cairo_run(JSON.stringify(erc20Sierra), programInputs);
}

async function runSmile(programInputs: string): any {
    await runnerInit();
    await proverInit();

    console.log("Running with inputs: ", programInputs);
    return wasm_cairo_run(JSON.stringify(smileSierra), programInputs);

}

async function proveSmileRun() {
    await setupSmile;
    console.log("Proving Smile...");
    let smileProof = wasm_prove(
        new Uint8Array(cairoSmileRunOutput.trace),
        new Uint8Array(cairoSmileRunOutput.memory),
        cairoSmileRunOutput.output,
    );
    return {
        output: cairoSmileRunOutput.output,
        proof: smileProof,
    };
}

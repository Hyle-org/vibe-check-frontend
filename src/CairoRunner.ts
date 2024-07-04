// Cairo Wasm
import erc20Sierra from "./erc20-sierra.json";
import smileSierra from "./smile-sierra.json";
import runnerInit, { wasm_cairo_run } from "./runner-pkg/cairo_runner.js";
import proverInit, { wasm_prove } from "./prover-pkg/cairo_verifier.js";
import { ec } from "starknet";
import { CairoSmileArgs } from "./prover.js";
import JSZip from 'jszip';

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
    // Get quotient of euclidian division
    const pending_word = arr.length/31>>0;
    let words = [];
    for (let i = 0; i < pending_word; i += 1) {
        // Take each letter, encode as hex
        words.push(BigInt(
            "0x" +
            arr.slice(0, 31*pending_word)
            .split("")
            .map((x) => x.charCodeAt(0).toString(16))
            .join(""),
        ).toString());
        arr = arr.substring(31);
    }
    // Add the rest of arr to words
    const pending_word_len = arr.length;
    words.push(BigInt(
        "0x" +
        arr
        .split("")
        .map((x) => x.charCodeAt(0).toString(16))
        .join(""),
    ).toString());

    return `${pending_word} ${words.join(" ")} ${pending_word_len}`;
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
    return Math.exp(x) / (Math.exp(x) + 1);
};

onmessage = function (e) {
    if (e.data[0] === "run-erc20") {
        console.log("ERC20 Worker started");
        setupErc20 = runErc20(computeArgs(e.data[1]));
    } else if (e.data[0] === "run-smile") {
        console.log("Smile Worker started");
        setupSmile = runSmile(computeSmileArgs(e.data[1])).then((result) => {
            // Get last parameter of the serialized HyleOutput struct
            const last = result.output.split(" ").reverse()[0];

            // Process felt as a signed integer.
            let res = BigInt(last.split("]")[0]);
            // 2^128
            if (res > 340282366920938463463374607431768211456n)
                res = -(3618502788666131213697322783095070105623107215331596699973092056135872020481n - res);
            // Avoid NaNs in exp
            if (res > 10000000n) res = 10000000n;
            if (res < -10000000n) res = -10000000n;

            this.postMessage({ ...result, vibe: sigmoid(+res.toString() / 100000) });
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

    return wasm_cairo_run(JSON.stringify(smileSierra), programInputs);
}


async function proveERC20Run() {
    await setupErc20;
    console.log("Proving ERC20...");
    const form = new FormData();

    const memoryZip = new JSZip();
    memoryZip.file('memory', cairoERC20RunOutput.memory);
    const memoryZipData = await memoryZip.generateAsync({ type: 'blob' });

    const traceZip = new JSZip();
    traceZip.file('trace', new Uint8Array(cairoERC20RunOutput.trace));
    const traceZipData = await traceZip.generateAsync({ type: 'blob' });

    form.append("memory", memoryZipData);
    form.append("trace", traceZipData);
    form.append("output", cairoERC20RunOutput.output);

    const requestOptions: RequestInit = {
        method: "POST",
        body: form
    };

    let proveResponse = await fetch(`http://localhost:3000/prove`, requestOptions)
        .catch(error => console.log("error", error));

    let erc20Proofb64 = await proveResponse.text();
    
    return {
        output: cairoERC20RunOutput.output,
        proof: base64ToArrayBuffer(erc20Proofb64),
    };
}

async function proveSmileRun() {
    await setupSmile;
    console.log("Proving Smile...");
    const form = new FormData();

    const memoryZip = new JSZip();
    memoryZip.file('memory', cairoSmileRunOutput.memory);
    const memoryZipData = await memoryZip.generateAsync({ type: 'blob' });

    const traceZip = new JSZip();
    traceZip.file('trace', new Uint8Array(cairoSmileRunOutput.trace));
    const traceZipData = await traceZip.generateAsync({ type: 'blob' });

    form.append("memory", memoryZipData);
    form.append("trace", traceZipData);
    form.append("output", cairoSmileRunOutput.output);

    const requestOptions: RequestInit = {
        method: "POST",
        body: form
    };

    let proveResponse = await fetch(`http://localhost:3000/prove`, requestOptions)
        .catch(error => console.log("error", error));

    let smileProofb64 = await proveResponse.text();
    return {
        output: cairoSmileRunOutput.output,
        proof: base64ToArrayBuffer(smileProofb64),
    };
}

function base64ToArrayBuffer(base64: string) {
    var binaryString = atob(base64);
    var bytes = new Uint8Array(binaryString.length);
    for (var i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
}
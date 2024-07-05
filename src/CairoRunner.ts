// Cairo Wasm
import erc20Sierra from "./erc20-sierra.json";
import smileSierra from "./smile-sierra.json";
import runnerInit, { wasm_cairo_run } from "./runner-pkg/cairo_runner.js";
import proverInit, { wasm_prove } from "./prover-pkg/cairo_verifier.js";
import JSZip from "jszip";

import { CairoArgs, CairoSmileArgs, hashBalance, serByteArray } from "./CairoHash";
import { getCairoProverUrl } from "./network.js";

var cairoERC20RunOutput: any;
var cairoSmileRunOutput: any;
var setupErc20: Promise<any>;
var setupSmile: Promise<any>;

// exported for testing
export function computeErc20Args(args: CairoArgs): string {
    const balances = args.balances.map((x) => `${serByteArray(x.name)} ${x.amount}`).join(" ");

    let hash = hashBalance(args.balances);

    return `[${args.balances.length} ${balances} ${args.amount} ${serByteArray(args.from)} ${serByteArray(args.to)} ${hash}]`;
}

export function computeSmileArgs(args: CairoSmileArgs): string {
    const initialState = 666;

    return `[${initialState} ${serByteArray(args.identity)} ${args.image.length} ${args.image.join(" ")}]`;
}

onmessage = function (e) {
    if (e.data[0] === "run-erc20") {
        console.log("ERC20 Worker started");
        setupErc20 = runErc20(computeErc20Args(e.data[1]));
    } else if (e.data[0] === "run-smile") {
        console.log("Smile Worker started");
        setupSmile = runSmile(computeSmileArgs(e.data[1]));
        setupSmile.then((result) => postMessage(["smile-ran", result]));
    } else if (e.data[0] === "prove-erc20") {
        proveERC20Run().then((result) => {
            console.log("Worker job done");
            postMessage(result);
        });
    } else if (e.data[0] === "prove-smile") {
        proveSmileRun().then((result) => {
            console.log("Worker job done");
            postMessage(["smile-proof", result]);
        });
    }
};

async function runErc20(programInputs: string) {
    await runnerInit();
    await proverInit();

    cairoERC20RunOutput = wasm_cairo_run(JSON.stringify(erc20Sierra), programInputs);
}

export async function runSmile(programInputs: string): Promise<any> {
    await runnerInit();
    await proverInit();

    cairoSmileRunOutput = wasm_cairo_run(JSON.stringify(smileSierra), programInputs);
    return cairoSmileRunOutput;
}

async function proveERC20Run() {
    await setupErc20;
    console.log("Proving ERC20...");
    const form = new FormData();

    console.log(cairoERC20RunOutput);

    const memoryZip = new JSZip();
    memoryZip.file("memory", cairoERC20RunOutput.memory);
    const memoryZipData = await memoryZip.generateAsync({ type: "blob" });

    console.log("ERC20 memory zipped");

    const traceZip = new JSZip();
    traceZip.file("trace", new Uint8Array(cairoERC20RunOutput.trace));
    const traceZipData = await traceZip.generateAsync({ type: "blob" });

    console.log("ERC20 trace zipped");

    form.append("memory", memoryZipData);
    form.append("trace", traceZipData);
    form.append("output", cairoERC20RunOutput.output);

    const requestOptions: RequestInit = {
        method: "POST",
        body: form,
    };

    let proveResponse = await fetch(getCairoProverUrl() + "/prove", requestOptions).catch((error) =>
        console.log("error", error),
    );

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

    console.log(cairoSmileRunOutput);

    const memoryZip = new JSZip();
    memoryZip.file("memory", cairoSmileRunOutput.memory);
    const memoryZipData = await memoryZip.generateAsync({ type: "blob" });

    console.log("ERC20 memory zipped");

    const traceZip = new JSZip();
    traceZip.file("trace", new Uint8Array(cairoSmileRunOutput.trace));
    const traceZipData = await traceZip.generateAsync({ type: "blob" });

    console.log("ERC20 trace zipped");

    form.append("memory", memoryZipData);
    form.append("trace", traceZipData);
    form.append("output", cairoSmileRunOutput.output);

    const requestOptions: RequestInit = {
        method: "POST",
        body: form,
    };

    let proveResponse = await fetch(getCairoProverUrl() + "/prove", requestOptions).catch((error) =>
        console.log("error", error),
    );

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

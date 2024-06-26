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

function serByteArray(arr: ByteArray): string {
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
import { ec } from "starknet";

// exported for testing
export function computeArgs(args: CairoArgs): string {
    const balances = args.balances.map((x) => `${serByteArray(x.name)} ${x.amount}`).join(" ");

    let hash = [1, ...balances.split(" ")].reduce((acc, x) => {
        return ec.starkCurve.pedersen(acc, +x); // Hope this doesn't overflow
    });

    return `[${args.balances.length} ${balances} ${args.amount} ${serByteArray(args.from)} ${serByteArray(args.to)} ${BigInt(hash).toString()}]`;
}

export const proveERC20Transfer = async (args: CairoArgs) => {
    const worker = new Worker(new URL("./CairoRunner.ts", import.meta.url), {
        type: "module",
    });
    return JSON.stringify(
        await new Promise((resolve) => {
            worker.onmessage = (e) => {
                resolve(e);
                worker.terminate();
            };
            worker.postMessage(["run", computeArgs(args)]);
            worker.postMessage(["prove"]);
        }),
    );
};

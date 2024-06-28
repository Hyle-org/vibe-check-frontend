import { expect, test } from "bun:test";
import runnerInit, { wasm_cairo_run } from "./runner-pkg/cairo_runner.js";
import sierra from "./sierra.json";
import { computeArgs } from "./CairoRunner.js";

test("parse cairo args", () => {
    expect(
        computeArgs({
            balances: [
                { name: "alex", amount: 1 },
                { name: "bryan", amount: 2 },
            ],
            amount: 3,
            from: "cfof",
            to: "daer",
        }),
    ).toEqual(
        "[2 0 1634493816 4 1 0 422827352430 5 2 3 0 1667657574 4 0 1684104562 4 2860314731281476507315630734206221670774113623634835853228573620291030899845]",
    );
});

test("CairoRunner", async () => {
    await runnerInit();
    const args = computeArgs({
        balances: [
            {
                name: "faucet",
                amount: 999999,
            },
            {
                name: "bryan.ecdsa_secp256r1",
                amount: 1,
            },
        ],
        amount: 1000,
        from: "faucet",
        to: "jenny.ecdsa_secp256r1",
    });
    expect(args).toEqual(
        "[2 0 112568767309172 6 999999 0 143880692283855892562876867187038471707818953437745 21 1 1000 0 112568767309172 6 0 155498244330488045306850287589664177200672003224113 21 2660732945440753159816364218357196738540210380489107417003740483648558606423]",
    );
    const { trace, memory, output } = wasm_cairo_run(sierra, args);
    expect(trace.length).toEqual(3145728);
    expect(memory.length).toEqual(233760);
    expect(output).toEqual(
        "[1, 2660732945440753159816364218357196738540210380489107417003740483648558606423, 1971067504311848062035187400520237511515966380158318963753370573341395323621, 0, 0, 0, 0, 0, 0, 0, 0, 112568767309172, 6, 0, 155498244330488045306850287589664177200672003224113, 21, 1000]",
    );
});

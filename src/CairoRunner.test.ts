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
        "[2 0 1634493816 4 1 0 422827352430 5 2 3 0 1667657574 4 0 1684104562 4 1160868784830838647559744427319626586815919010720338210135894356628337509144]",
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
    console.log("args", args);
    expect(wasm_cairo_run(sierra, args)).toEqual("0");
});

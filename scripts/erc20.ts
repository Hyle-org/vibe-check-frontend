import { broadcastTx, ensureContractsRegistered, setupCosmos } from "./cosmos";
import { proveERC20Transfer } from "./prover";
import * as fs from "fs";

const cosmos = setupCosmos("http://localhost:26657");

const data = await proveERC20Transfer({
    balances: [
        {
            name: "alex",
            amount: 1,
        },
        {
            name: "bryan",
            amount: 2,
        },
    ],
    amount: 1,
    from: "alex",
    to: "bryan",
});

console.log("Proof generated:");

fs.writeFileSync("proof.json", data);

await cosmos;
await ensureContractsRegistered();

console.log(await broadcastTx("", "", data));

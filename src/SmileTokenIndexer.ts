import { ref, watchEffect } from "vue";
import { GetAllStateChanges } from "./indexer";

export const SmileTokenBalances = ref({} as Record<string, number>);

export function getBalances(): { name: string; amount: number }[] {
    return Object.entries(SmileTokenBalances.value).map(([name, amount]) => ({ name, amount }));
}

const state_changes = GetAllStateChanges();

export type BalanceChange = {
    from: string;
    to: string;
    value: number;
};

watchEffect(async () => {
    const changes: BalanceChange[] = state_changes.value
    .map((transaction) => {
        const transactionStateChange = transaction.messages.stateChanges
        .filter((stateChange) => stateChange.contractName == "smile_token")
        .map((stateChange) => GetErc20Output(stateChange.proof));
        // There can only be one state change for one contract
        return transactionStateChange[0]
    });
    SmileTokenBalances.value = processChanges(changes);
});

// Compute the current state
function processChanges(changes: BalanceChange[]) {
    const newBalances = {} as Record<string, number>;
    newBalances["faucet"] = 1000000;
    changes.forEach((change) => {
        newBalances[change.from] -= change.value;
        if (newBalances[change.to]) newBalances[change.to] += change.value;
        else newBalances[change.to] = change.value;
    });
    return newBalances;
}

const GetErc20Output = (rawProof: Uint8Array): BalanceChange => {
    const proof = new DataView(rawProof.buffer, rawProof.byteOffset, rawProof.byteLength);
    const proofSize = proof.getUint32(0, true);
    const inputsSize = proof.getUint32(proofSize + 4, true);
    const outputs = proof.buffer.slice(proofSize + 8 + inputsSize);
    const hexOutputs = Array.from(new Uint8Array(outputs))
        .map((x) => x.toString(16).padStart(2, "0"))
        .join("");
    // Horrible
    const faucetPos = hexOutputs.search("06666175636574");
    // Parse length of other name
    const nameLength = parseInt(hexOutputs.slice(faucetPos + 14 + 2, faucetPos + 16 + 2), 16); // +2 is for the discriminant bytes for the Option
    // Parse name - first as a hex string
    const nameHex = hexOutputs.slice(faucetPos + 16 + 2, faucetPos + 16 + 2 + nameLength * 2);
    // then as ascii
    let name = "";
    for (let i = 0; i < nameHex.length; i += 2) {
        const charCode = parseInt(nameHex.slice(i, i + 2), 16);
        if (charCode === 0) {
            break;
        }
        name += String.fromCharCode(charCode);
    }
    // Parse int
    const intv = parseInt(hexOutputs.slice(faucetPos + 16 + 4 + nameLength * 2, faucetPos + 16 + 4 + nameLength * 2 + 2), 16); // +4 is for the TWO discriminants bytes for the Option
    let val;
    const intStartPos = faucetPos + 16 + nameLength * 2 + 2;
    if (intv < 251) {
        val = intv;
    } else if (intv < 252) {
        // parse as big endian u16
        val =
            parseInt(hexOutputs.slice(intStartPos, intStartPos + 2), 16) +
            parseInt(hexOutputs.slice(intStartPos + 2, intStartPos + 4), 16) * 256;
    } else {
        // parse as big endian u32
        val =
            parseInt(hexOutputs.slice(intStartPos, intStartPos + 2), 16) +
            parseInt(hexOutputs.slice(intStartPos + 2, intStartPos + 4), 16) * 256 +
            parseInt(hexOutputs.slice(intStartPos + 4, intStartPos + 6), 16) * 256 * 256 +
            parseInt(hexOutputs.slice(intStartPos + 6, intStartPos + 8), 16) * 256 * 256 * 256;
    }
    return {
        from: "faucet",
        to: name,
        value: val,
    };
};

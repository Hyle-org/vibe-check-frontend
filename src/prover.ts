import { BarretenbergBackend } from '@noir-lang/backend_barretenberg';
import { InputMap, Noir } from '@noir-lang/noir_js';

import webAuthnCircuit from "./webauthn.json";

export const prove = async (noirInput: InputMap) => {
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
    var jsonProof = JSON.stringify({
        ...proof,
        proof: Array.from(proof.proof)
    });
    // fs.writeFileSync('../proofs/proof.json', jsonProof);
    // fs.writeFileSync('../proofs/vkey', verificationKey);
}

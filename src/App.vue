<script setup lang="ts">
import * as faceApi from "face-api.js";
import { onMounted, ref } from "vue";
import * as asn1js from "asn1js";
import * as pkijs from "pkijs";
import { BarretenbergBackend  } from '@noir-lang/backend_barretenberg';
import { Noir } from '@noir-lang/noir_js';
import * as fs from 'fs';
// Loading webauthn circuit
import circuit from "./webauthn.json";


// resize the overlay canvas to the input dimensions
const canvasOutput = ref<HTMLCanvasElement | null>(null);
const videoFeed = ref<HTMLVideoElement | null>(null);
const screenshotOutput = ref<HTMLCanvasElement | null>(null);

const screenshotData = ref<string | null>(null);
const fakeProcessingMessage = ref<string>("");
const detectionTimer = ref<unknown | null>(null);

const lastDetections = ref<faceApi.FaceDetection[]>([]);

const status = ref<string>("capturing");

onMounted(async () => {
    await faceApi.nets.tinyFaceDetector.loadFromUri("/models");
    navigator.mediaDevices
        .getUserMedia({ video: true, audio: false })
        .then(async (stream) => {
            videoFeed.value!.srcObject = stream;
            videoFeed.value!.play();
            detectionTimer.value = setInterval(async () => {
                const displaySize = { width: videoFeed.value!.clientWidth, height: videoFeed.value!.clientHeight }
                faceApi.matchDimensions(canvasOutput.value!, displaySize)
                lastDetections.value = await faceApi.detectAllFaces(videoFeed.value!, new faceApi.TinyFaceDetectorOptions())
                const resizedDetections = faceApi.resizeResults(lastDetections.value, displaySize)
                faceApi.draw.drawDetections(canvasOutput.value!, resizedDetections);
            }, 1000);
        })
        .catch((err) => {
            console.error(`An error occurred: ${err}`);
        });
});

const takeScreenshot = async () => {
    clearInterval(detectionTimer.value as number);
    const canvas = screenshotOutput.value!;
    canvas.width = videoFeed.value!.videoWidth;
    canvas.height = videoFeed.value!.videoHeight;
    const ctx = canvas.getContext("2d");
    if (ctx) {
        ctx.drawImage(videoFeed.value!, 0, 0, canvas.width, canvas.height);
        screenshotData.value = await createImageBitmap(canvas);
        const displaySize = { width: canvas.width, height: canvas.height }
        const resizedDetections = faceApi.resizeResults(lastDetections.value, displaySize)
        faceApi.draw.drawDetections(canvas, resizedDetections);
        fakeProcessingMessage.value = "...Enhancing...";
        status.value = "processing";
        zoomInOnBox(canvas, screenshotData.value!, resizedDetections[0].box.x, resizedDetections[0].box.y, resizedDetections[0].box.width, resizedDetections[0].box.height, 5);
    }
};

const zoomInOnBox = (canvas, img, x, y, width, height, steps) => {
    let currentStep = 0;

    const interval = setInterval(() => {
        if (currentStep >= steps + 1) {
            clearInterval(interval);
            fakeProcessingMessage.value = "...Checking your vibe...";
            status.value = "checking-vibe";

            if (Math.random() > 0.5) {
                setTimeout(() => {
                    fakeProcessingMessage.value = "Vibe check failed. You are not vibing.";
                    status.value = "failed";
                }, 1000);
            } else {
                setTimeout(() => {
                    fakeProcessingMessage.value = "Vibe check passed. You are vibing.";
                    status.value = "success";
                }, 1000);
            }
            return;
        }

        const newWidth = canvas.width * (1 - currentStep / steps) + width * (currentStep / steps);
        const newHeight = canvas.height * (1 - currentStep / steps) + height * (currentStep / steps);
        const newX = x * (currentStep / steps);
        const newY = y * (currentStep / steps);

        const ctx = canvas.getContext("2d");
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, newX, newY, newWidth, newHeight, 0, 0, canvas.width, canvas.height);

        currentStep++;
    }, 400);
}

const prepareTx = () => {
    return {
        tx_bytes: "0x1234",
        mode: "BROADCAST_MODE_SYNC",
    };
}

function extractPublicKeyCoordinates(publicKeyInfo: ArrayBuffer): [x: Uint8Array, y: Uint8Array] {
    const asn1 = asn1js.fromBER(publicKeyInfo);
    if (asn1.offset === -1) {
        throw new Error("PublicKey wrongly formatted");
    }

    const spki = new pkijs.PublicKeyInfo({ schema: asn1.result });

    const subjectPublicKey = spki.subjectPublicKey.valueBlock.valueHex;
    const keyData = new Uint8Array(subjectPublicKey);

    if (keyData[0] !== 0x04) {
        throw new Error("PublicKey is not in expected format");
    }

    const x = keyData.slice(1, 33);
    const y = keyData.slice(33, 65);

    return [x, y];
}

function extractSignature(signature: ArrayBuffer): Uint8Array {
    const asn1 = asn1js.fromBER(signature);
    if (asn1.offset === -1) {
    throw new Error("Signature wrongly formatted");
    }

    const sequence = asn1.result;
    if (!(sequence instanceof asn1js.Sequence) || sequence.valueBlock.value.length !== 2) {
    throw new Error("Unexpected ASN.1 structure");
    }

    const rBlock = sequence.valueBlock.value[0] as asn1js.Integer;
    const sBlock = sequence.valueBlock.value[1] as asn1js.Integer;

    var r = new Uint8Array(rBlock.valueBlock.valueHex);
    var s = new Uint8Array(sBlock.valueBlock.valueHex);
    if (r.length == 33) {
        r = r.slice(1);
    }
    if (s.length == 33) {
        s = s.slice(1);
    }

    // Assurez-vous que r et s sont exactement de 32 octets chacun
    const rPadded = new Uint8Array(32);
    rPadded.set(r, 32 - r.length);
    const sPadded = new Uint8Array(32);
    sPadded.set(s, 32 - s.length);

    const signature64 = new Uint8Array(64);
    signature64.set(rPadded, 0);
    signature64.set(sPadded, 32);

return signature64;
}

function padRightWithZeros(input: ArrayBufferLike): Uint8Array {
    var targetLength = 255;
    var inputArray = new Uint8Array(input);
    if (inputArray.length >= targetLength) {
        return inputArray;
    }

    const paddedArray = new Uint8Array(targetLength);
    paddedArray.set(inputArray, 0);

    return paddedArray;
}


function prettyPrintUintArray(name: string, input: ArrayBufferLike) {
    console.log(name, " = ", "[", new Uint8Array(input).join(","), "]");
}

// Challenge should be 16bytes long
// https://www.w3.org/TR/webauthn-2/#sctn-cryptographic-challenges
var challenge = Uint8Array.from("0123456789abcdef0123456789abcdef", c => c.charCodeAt(0));
var noirInput = {};

const webAuthn = async () => {
    const publicKey = {
        attestation: "none",
        authenticatorSelection: {
            authenticatorAttachment: "cross-platform",
            requireResidentKey: false,
            residentKey: "discouraged",
        },
        challenge: challenge,
        pubKeyCredParams: [{ alg: -7, type: "public-key" }],
        rp: { name: "Vibe Checker", id: "localhost" },
        timeout: 600000,
        user: { id: Uint8Array.from("myUserId", c => c.charCodeAt(0)), name: "jamiedoe", displayName: "Jamie Doe" },
    };

    var attestation = await navigator.credentials.create({ publicKey: publicKey });

    const getRequest = {
        allowCredentials: [
            { id: attestation.rawId, type: "public-key" }
        ],
        challenge: challenge,
        rpId: "localhost",
        attestation: "none",
        timeout: 600000,
        userVerification: "discouraged",
    };

    var assertion = await navigator.credentials.get({ publicKey: getRequest })

    // Extract values from webauthn interactions
    var pubKey = attestation.response.getPublicKey();
    var signature = assertion.response.signature;
    var clientDataJSON = await assertion.response.clientDataJSON;
    var authenticatorData = await assertion.response.authenticatorData;

    // Format values to make them exploitable
    // TODO: isn't it flaky ? When r/s are padded with 00
    var [pub_key_x, pub_key_y] = extractPublicKeyCoordinates(pubKey);
    var extracted_signature = extractSignature(new Uint8Array(signature));
    var paddedClientDataJSON = padRightWithZeros(new Uint8Array(clientDataJSON));
    // challenge is containted in the clientDataJSON: https://www.w3.org/TR/webauthn-2/#dictionary-client-data
    // TODO: exported challenge should NOT be extracted from clientDataJSON
    var extracted_challenge = clientDataJSON.slice(36,36+43);
    var client_data_json_len = clientDataJSON.byteLength;

    noirInput = {
        authenticator_data: new Uint8Array(authenticatorData),
        client_data_json_len: client_data_json_len,
        client_data_json: new Uint8Array(paddedClientDataJSON),
        signature: new Uint8Array(extracted_signature),
        challenge: new Uint8Array(extracted_challenge),
        pub_key_x: new Uint8Array(pub_key_x),
        pub_key_y: new Uint8Array(pub_key_y)
    };
    console.log(noirInput);

    // Display values
    // prettyPrintUintArray("authenticatorData", authenticatorData);
    // prettyPrintUintArray("clientDataJSON", paddedClientDataJSON);
    // prettyPrintUintArray("signature", extracted_signature);
    // prettyPrintUintArray("extracted_challenge", extracted_challenge);
    // prettyPrintUintArray("challenge", challenge);
    // prettyPrintUintArray("pub_key_x", pub_key_x);
    // prettyPrintUintArray("pub_key_y", pub_key_y);
}

const prove = async () => {
    // Circuit tools setup
    const backend = new BarretenbergBackend(circuit);
    console.log("hi...");
    // const verificationKey = await backend.getVerificationKey();
    const verificationKey = await backend.getVerificationKey();
    console.log("...oké");

    /////// LOCAL PROOF CREATION /////////
    // Proving
    const noir = new Noir(circuit, backend);
    const proof = await noir.generateProof(noirInput);
    var jsonProof = JSON.stringify({
        ...proof,
        proof: Array.from(proof.proof)
    });
    fs.writeFileSync('../proofs/proof.json', jsonProof);
    fs.writeFileSync('../proofs/vkey', verificationKey);
}

const signAndSend = async () => {
    const tx = prepareTx()
    // Show relevant details to the user
    // Sign the transaction

    // Send the transaction
    await setupCosmos("http://localhost:26657");
    const resp = await broadcastTx();
    setTimeout(async () => console.log(await checkTxStatus(resp.transactionHash)), 1000);

    // Switch to waiter view
}
</script>

<template>
    <div class="container m-auto">
        <h1 class="text-center my-4">Vibe Check</h1>
        <h3 class="text-center my-4">Hylé</h3>
        <template v-if="status == 'signing'">
            <p>TX Hash: 0x123134134134</p>
            <p>Signed by public address 0x43990843.webAuthn</p>
            <p>1 - Signing</p>
            <p>2 - Sending</p>
        </template>
        <template v-else-if="status == 'recap'">
            <p>TX <a>0x123134134134</a> has been sent!</p>
            <p>Signed by public address 0x43990843.webAuthn</p>
            <p>Leaderboard</p>
        </template>
        <template v-else>
            <div class="flex justify-center">
                <div :class="'rounded-xl overflow-hidden mirror relative ' + (!screenshotData ? '' : 'hidden')">
                    <video ref="videoFeed" autoplay></video>
                    <canvas class="absolute top-0" ref="canvasOutput"></canvas>
                </div>
                <div :class="'relative ' + (!screenshotData ? 'hidden' : '')">
                    <canvas :class="`mirror ${status}`" ref="screenshotOutput"></canvas>
                    <div class="absolute top-0 w-full h-full flex justify-center items-center">
                        <p class="text-white font-semibold">{{ fakeProcessingMessage }}</p>
                    </div>
                </div>
            </div>
            <div v-if="status != 'success' && status != 'failed'" class="flex justify-center my-8">
                <button @click="takeScreenshot">Claim token</button>
            </div>
            <div v-else class="flex justify-center my-8">
                <button @click="signAndSend">Sign & send TX</button>
            </div>
            <div class="flex justify-center my-8">
                <button @click="webAuthn">webAuthn</button>
            </div>
            <div class="flex justify-center my-8">
                <button @click="prove">Prove webAuthn</button>
            </div>
        </template>
    </div>
</template>

<style>
h1 {
    @apply text-4xl;
}

button {
    @apply bg-blue-500 text-white font-bold py-2 px-4 rounded;
}

button:hover {
    @apply bg-blue-400;
}

button:active {
    @apply bg-blue-800;
}

.mirror {
    /* Mirror it so people look normal */
    -webkit-transform: scaleX(-1);
    transform: scaleX(-1);
}

/* Slowly animate towards red and very high contrast*/
canvas.failed {
    @apply animate-[fail_3s_forwards];
}

canvas.success {}

@keyframes fail {
    0% {
        filter: contrast(100%) grayscale(0%);
    }

    100% {
        filter: contrast(250%) grayscale(100%);
    }
}
</style>

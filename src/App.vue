<script setup lang="ts">
import * as faceApi from "face-api.js";
import { onMounted, ref } from "vue";

// resize the overlay canvas to the input dimensions
const canvasOutput = ref<HTMLCanvasElement | null>(null);
const videoFeed = ref<HTMLVideoElement | null>(null);
const screenshotOutput = ref<HTMLCanvasElement | null>(null);

const screenshotData = ref<string | null>(null);
const fakeProcessingMessage = ref<string>("");
const detectionTimer = ref<unknown | null>(null);

const lastDetections = ref<faceApi.FaceDetection[]>([]);

const status = ref<string>("capturing");

// onMounted(async () => {
//     await faceApi.nets.tinyFaceDetector.loadFromUri("/models");
//     navigator.mediaDevices
//         .getUserMedia({ video: true, audio: false })
//         .then(async (stream) => {
//             videoFeed.value!.srcObject = stream;
//             videoFeed.value!.play();
//             detectionTimer.value = setInterval(async () => {
//                 const displaySize = { width: videoFeed.value!.clientWidth, height: videoFeed.value!.clientHeight }
//                 faceApi.matchDimensions(canvasOutput.value!, displaySize)
//                 lastDetections.value = await faceApi.detectAllFaces(videoFeed.value!, new faceApi.TinyFaceDetectorOptions())
//                 const resizedDetections = faceApi.resizeResults(lastDetections.value, displaySize)
//                 faceApi.draw.drawDetections(canvasOutput.value!, resizedDetections);
//             }, 1000);
//         })
//         .catch((err) => {
//             console.error(`An error occurred: ${err}`);
//         });
// });

const takeScreenshot = async () => {
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
    // Prepare the transaction
}

function readAsn1IntegerSequence(input: Uint8Array) {
    // https://www.w3.org/TR/webauthn-2/#sctn-signature-attestation-types
    if (input[0] !== 0x30) throw new Error('Input is not an ASN.1 sequence');
    const seqLength = input[1];
    const elements : Uint8Array[] = [];


    let current = input.slice(2, 2 + seqLength);
    while (current.length > 0) {
        const tag = current[0];
        if (tag !== 0x02) throw new Error('Expected ASN.1 sequence element to be an INTEGER');


        const elLength = current[1];
        elements.push(current.slice(2, 2 + elLength));


        current = current.slice(2 + elLength);
    }

    if (elements.length !== 2) throw new Error('Expected 2 ASN.1 sequence elements');
    let [r, s] = elements;

    return [r.buffer, s.buffer];
}

// Challenge should be 32bytes long
var challenge = Uint8Array.from("0123456789abcdef0123456789abcdef", c => c.charCodeAt(0));


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

    var publicKeyCredential = await navigator.credentials.create({ publicKey: publicKey });
    var pubKey = publicKeyCredential.response.getPublicKey();

    var x_buff = pubKey.slice(-64, -32);
    var y_buff = pubKey.slice(-32);

    const getRequest = {
        allowCredentials: [
            { id: publicKeyCredential.rawId, type: "public-key"}
        ],
        challenge: challenge,
        rpId: "localhost",
        attestation: "none",
        timeout: 600000,
        userVerification: "discouraged",
    };
    
    var assertion = await navigator.credentials.get({ publicKey: getRequest })

    var signature = new Uint8Array(assertion.response.signature);
	var [r_buffer, s_buffer]= readAsn1IntegerSequence(new Uint8Array(signature));

    var clientDataJSON = await assertion.response.clientDataJSON;
    var authenticatorData = await assertion.response.authenticatorData;
    // challenge is containted in the clientDataJSON: https://www.w3.org/TR/webauthn-2/#dictionary-client-data
    // TODO: Should not be extracted from clietnDataJSON. Should be computed separatly
    var extracted_challenge = clientDataJSON.slice(36,36+32);

    console.log("authenticatorData = ", new Uint8Array(authenticatorData));
    console.log("clientDataJSON = ", new Uint8Array(clientDataJSON));
    console.log("clientDataJSON = ", clientDataJSON);
    console.log("extracted_challenge = ", new Uint8Array(extracted_challenge));
    console.log("signature = ", assertion.response.signature);
    console.log("r = ", new Uint8Array(assertion.response.signature.slice(4, 36)));
    console.log("s? = ", new Uint8Array(assertion.response.signature.slice(39, 71)));
    console.log("signature_r = ", new Uint8Array(r_buffer));
    console.log("signature_s = ", new Uint8Array(s_buffer));
    console.log("x_buff = ", new Uint8Array(x_buff));
    console.log("y_buff = ", new Uint8Array(y_buff));

    // console.log("x = ", BigInt("0x" + buf2hex(x_buff), 16));
    // console.log("y = ", BigInt("0x" + buf2hex(y_buff), 16));
    // console.log("r = ", BigInt("0x" + buf2hex(r_buffer), 16));
    // console.log("s = ", BigInt("0x" + buf2hex(s_buffer), 16));
}

const signAndSend = async () => {
    const tx = prepareTx()
    // Show relevant details to the user
    // Sign the transaction

    // Send the transaction

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
                <!-- <div :class="'rounded-xl overflow-hidden mirror relative ' + (!screenshotData ? '' : 'hidden')">
                    <video ref="videoFeed" autoplay></video>
                    <canvas class="absolute top-0" ref="canvasOutput"></canvas>
                </div>
                <div :class="'relative ' + (!screenshotData ? 'hidden' : '')">
                    <canvas :class="`mirror ${status}`" ref="screenshotOutput"></canvas>
                    <div class="absolute top-0 w-full h-full flex justify-center items-center">
                        <p class="text-white font-semibold">{{ fakeProcessingMessage }}</p>
                    </div>
                </div> -->
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

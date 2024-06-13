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

const buf2hex = (buffer) => {
  return [...new Uint8Array(buffer)]
      .map(x => x.toString(16).padStart(2, '0'))
      .join('');
}

let rawId;
let publicKey_str;

const webAuthnCreate = async () => {
    const publicKey = {
        attestation: "none",
        authenticatorSelection: {
            authenticatorAttachment: "cross-platform",
            requireResidentKey: false,
            residentKey: "discouraged",
        },
        challenge: Uint8Array.from("txHash", c => c.charCodeAt(0)),
        pubKeyCredParams: [{ alg: -7, type: "public-key" }],
        rp: { name: "Vibe Checker", id: "localhost" },
        timeout: 600000,
        user: { id: Uint8Array.from("myUserId", c => c.charCodeAt(0)), name: "jamiedoe", displayName: "Jamie Doe" },
    };

    let publicKeyCredential = await navigator.credentials.create({ publicKey: publicKey });
    publicKey_str = buf2hex(publicKeyCredential.response.getPublicKey());
    rawId = publicKeyCredential.rawId;
    console.log(publicKeyCredential);
    // console.log(publicKeyCredential.response.id);
}

const webAuthnGetwithId = async () => {
    let temp = "q0hhp1Z0kDMQRBsRIeaX52bL9qXjb6D1_jcmfbWt3k5jbfVZawp19BW5oGz7MJuBi4LvQr-U6LM1Z1Pv-3NUGQ";
    const getRequest = {
        allowCredentials: [
            { id: Uint8Array.from(temp, c => c.charCodeAt(0)), type: "public-key"}
        ],
        challenge: Uint8Array.from("txHash", c => c.charCodeAt(0)),
        rpId: "localhost",
        attestation: "none",
        timeout: 600000,
        userVerification: "discouraged",
    };
    navigator.credentials.get({ publicKey: getRequest })
        .then(function (assertion) {
            const signature = buf2hex(assertion.response.signature);
            const authenticatorData = buf2hex(assertion.response.authenticatorData);
            console.log(assertion.response);
            console.log("pubkey = "+ publicKey_str);
            console.log("signature = " + signature);
            console.log("authenticatorData = " + authenticatorData);
        }).catch(function (err) {
            console.log(err);
        });
}

const webAuthnGetwithoutId = async () => {
    const getRequest = {
        allowCredentials: [],
        challenge: Uint8Array.from("txHash", c => c.charCodeAt(0)),
        rpId: "localhost",
        attestation: "none",
        timeout: 600000,
        userVerification: "discouraged",
    };
    navigator.credentials.get({ publicKey: getRequest })
        .then(function (assertion) {
            const signature = buf2hex(assertion.response.signature);
            const authenticatorData = buf2hex(assertion.response.authenticatorData);
            console.log(assertion.response);
            console.log("pubkey = "+ publicKey_str);
            console.log("signature = " + signature);
            console.log("authenticatorData = " + authenticatorData);
        }).catch(function (err) {
            console.log(err);
        });
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
                <button @click="webAuthnCreate">webAuthnCreate</button>
            </div>
            <div class="flex justify-center my-8">
                <button @click="webAuthnGetwithId">webAuthnGetwithId</button>
            </div>
            <div class="flex justify-center my-8">
                <button @click="webAuthnGetwithoutId">webAuthnGetwithoutId</button>
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

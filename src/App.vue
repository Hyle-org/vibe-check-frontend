<script setup lang="ts">
import * as faceApi from "face-api.js";
import { nextTick, onMounted, ref, watchEffect } from "vue";
import { webAuthn } from "./webauthn";
import { prove } from "./prover";
import { setupCosmos, broadcastTx, checkTxStatus } from "./cosmos";

import Logo from "./assets/Hyle_logo.svg";

// These are references to HTML elements
const canvasOutput = ref<HTMLCanvasElement | null>(null);
const videoFeed = ref<HTMLVideoElement | null>(null);
const screenshotOutput = ref<HTMLCanvasElement | null>(null);

// Inner state of the screenshotting logic
const screenshotData = ref<string | null>(null);
const detectionTimer = ref<unknown | null>(null);
const lastDetections = ref<faceApi.FaceDetection[]>([]);

// General state machine state
const status = ref<string>("start");
const screen = ref<string>("start");
const error = ref<string | null>(null);

// Match screen to status
watchEffect(() => {
    const statusToScreen = {
        start: "start",
        "pre-authenticating": "start",
        authenticating: "start",
        failed_authentication: "start",

        authenticated: "camera",
        camera_playing: "camera",
        failed_camera: "camera",

        screenshotting: "camera",
        processing: "screenshot", // This is the "zoom" step.

        checking_vibe: "screenshot",
        failed_vibe: "screenshot",
        success_vibe: "screenshot",

    } as any;
    if (statusToScreen[status.value] !== screen.value)
        screen.value = statusToScreen[status.value];
});

const noirInput = ref<unknown | null>(null);

onMounted(async () => {
    // For some reason this fails if done too early
    await faceApi.nets.tinyFaceDetector.loadFromUri("/models");
});

const zoomInOnBox = async (canvas, img, x, y, width, height, steps) => {
    await new Promise((resolve) => {
        let currentStep = 0;
        const interval = setInterval(() => {
            if (currentStep >= steps + 1) {
                clearInterval(interval);
                resolve(null);
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
    });
}

const doWebAuthn = async () => {
    status.value = "pre-authenticating";
    // Wait 2s
    await new Promise((resolve) => setTimeout(resolve, 2000));
    status.value = "authenticating";
    try {
        noirInput.value = await webAuthn();
        status.value = "authenticated";

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
            videoFeed.value!.srcObject = stream;
            videoFeed.value!.play();
            nextTick(() => status.value = "camera_playing");
            detectionTimer.value = setInterval(async () => {
                const displaySize = { width: videoFeed.value!.clientWidth, height: videoFeed.value!.clientHeight }
                faceApi.matchDimensions(canvasOutput.value!, displaySize)
                lastDetections.value = await faceApi.detectAllFaces(videoFeed.value!, new faceApi.TinyFaceDetectorOptions())
                const resizedDetections = faceApi.resizeResults(lastDetections.value, displaySize)
                faceApi.draw.drawDetections(canvasOutput.value!, resizedDetections);
            }, 1000);
        } catch (e) {
            console.error(e);
            error.value = `${e}`;
            status.value = "failed_camera";
        };
    } catch (e) {
        console.error(e);
        error.value = `${e}`;
        status.value = "failed_authentication";
    }
}

const takeScreenshot = async () => {
    clearInterval(detectionTimer.value as number);
    status.value = "screenshotting";
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
        status.value = "processing";
        // TODO: we should cheat here and send the image to giza right away.
        await zoomInOnBox(canvas, screenshotData.value!, resizedDetections[0].box.x, resizedDetections[0].box.y, resizedDetections[0].box.width, resizedDetections[0].box.height, 5);
        checkVibe();
    }
};

const checkVibe = () => {
    status.value = "checking_vibe";

    // TODO: do this for real
    if (Math.random() > 0.5) {
        setTimeout(() => {
            status.value = "failed_vibe";
        }, 1000);
    } else {
        setTimeout(() => {
            status.value = "success_vibe";
        }, 1000);
    }
}

const doProve = async () => {
    prove(noirInput.value);
}

const prepareTx = () => {
    return {
        tx_bytes: "0x1234",
        mode: "BROADCAST_MODE_SYNC",
    };
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
        <h3 class="text-center my-4"><img :src="Logo" alt="Hylé logo" class="h-10 m-auto"></img></h3>
        <template v-if="screen == 'start'">
            <div class="flex flex-col justify-center h-[400px] max-h-[50vh] max-w-[50rem] m-auto img-background p-10">
                <div v-if="status === 'pre-authenticating' || status === 'authenticating'"
                    class="p-10 bg-black bg-opacity-70 rounded-xl">
                    <p class="text-center font-semibold font-anton mb-2">Authenticating via WebAuthn</p>
                    <p class="text-center">You will be asked to create a secure account<br />
                        using the secure enclave contained within your phone.</p>
                    <i class="mt-4 m-auto spinner"></i>
                </div>
                <div v-else-if="status === 'failed_authentication'" class="p-10 bg-black bg-opacity-70 rounded-xl">
                    <p class="text-center font-semibold font-anton mb-2">There was an error authenticating</p>
                    <p class="text-center text-sm font-mono">{{ error }}</p>
                </div>
            </div>
            <div class="flex justify-center my-8">
                <button @click="doWebAuthn" :disabled="status !== 'start' && status !== 'failed_authentication'">
                    Smile & get tokens
                </button>
            </div>
        </template>
        <template v-else-if="screen === 'camera' || screen === 'screenshot'">
            <!-- Have to do both at once or the refs won't work properly for the camera -> screnshot transition -->
            <div v-show="screen === 'camera'">
                <div v-show="status === 'authenticated' || status === 'failed_camera'"
                    class="flex flex-col justify-center h-[400px] max-h-[50vh] max-w-[50rem] m-auto img-background p-10">
                    <div v-if="status === 'authenticated'">
                        <i class="mt-4 m-auto spinner"></i>
                    </div>
                    <div v-if="status === 'failed_camera'" class="p-10 bg-black bg-opacity-70 rounded-xl">
                        <p class="text-center font-semibold font-anton mb-2">Camera couldn't be played</p>
                        <p class="text-center text-sm font-mono">{{ error }}</p>
                    </div>
                </div>
                <div v-show="status !== 'authenticated' && status !== 'failed_camera'" class="flex justify-center">
                    <div class="rounded overflow-hidden mirror relative">
                        <video ref="videoFeed" autoplay></video>
                        <canvas class="absolute top-0" ref="canvasOutput"></canvas>
                    </div>
                </div>
                <div class="flex justify-center my-8">
                    <button @click="takeScreenshot" :disabled="status !== 'camera_playing'">Get Tokens</button>
                </div>
            </div>
            <div v-show="screen === 'screenshot'">
                <div class="relative flex justify-center">
                    <canvas :class="`mirror rounded overflow-hidden ${status}`" ref="screenshotOutput"></canvas>
                    <div class="absolute top-0 w-full h-full flex justify-center items-center">
                        <p v-if="status === 'checking_vibe'" class="text-white font-semibold">
                            ...Checking your vibe...
                        </p>
                        <p v-else-if="status === 'failed_vibe'" class="text-white font-semibold">
                            Vibe check failed. You are not vibing.
                        </p>
                        <p v-else-if="status === 'success_vibe'" class="text-white font-semibold">
                            Vibe check passed. You are vibing.
                        </p>
                    </div>
                </div>
                <div class="flex justify-center my-8">
                    <button @click="signAndSend" :disabled="status !== 'failed_vibe' && status !== 'success_vibe'">Send
                        TX</button>
                </div>
            </div>
        </template>
        <!--
        <template v-else-if="status == 'signing'">
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
                <div :class="'rounded overflow-hidden mirror relative ' + (!screenshotData ? '' : 'hidden')">
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
                <button @click="takeScreenshot">Smile & get tokens</button>
            </div>
            <div v-else class="flex justify-center my-8">
                <button @click="signAndSend">Sign & send TX</button>
            </div>
            <div class="flex justify-center my-8">
                <button @click="doWebAuthn">webAuthn</button>
            </div>
            <div class="flex justify-center my-8">
                <button @click="doProve">Prove webAuthn</button>
            </div>
        </template>
        -->
    </div>
</template>

<style>
html {
    @apply font-garamond font-normal leading-snug;
}

h1,
h2,
h3,
h4,
h5,
h6 {
    @apply font-anton uppercase;
}

p {
    @apply font-garamond text-xl leading-6;
}

body {
    @apply bg-primary text-white font-garamond;
}

h1 {
    @apply text-4xl;
}

button {
    @apply bg-gray-900 font-anton uppercase rounded-full px-4 py-2 text-white;
}

button:hover:not(:disabled) {
    @apply tracking-widest;
}

button:active:not(:disabled) {
    @apply bg-secondary text-primary;
}

button:disabled {
    @apply bg-gray-500 text-opacity-50;
}

.img-background {
    background-image: url("./assets/image_satellite.jpg");
    background-size: cover;
    background-position: center;
}

i.spinner {
    @apply animate-spin;
    @apply block border-4 border-t-4 border-secondary border-t-primary rounded-full w-4 h-4;
}

.mirror {
    /* Mirror it so people look normal */
    -webkit-transform: scaleX(-1);
    transform: scaleX(-1);
}

/* Slowly animate towards red and very high contrast*/
canvas.failed_vibe {
    @apply animate-[fail_3s_forwards];
}

canvas.success_vibe {}

@keyframes fail {
    0% {
        filter: contrast(100%) grayscale(0%);
    }

    100% {
        filter: contrast(250%) grayscale(100%);
    }
}
</style>
./prover.test
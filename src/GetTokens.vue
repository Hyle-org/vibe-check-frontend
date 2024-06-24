<script setup lang="ts">
import * as faceApi from "face-api.js";
import { computed, nextTick, onMounted, ref, watchEffect } from "vue";
import { needWebAuthnCredentials, registerWebAuthnIfNeeded, signChallengeWithWebAuthn } from "./webauthn";
import { proveECDSA, proveSmile, proveERC20Transfer } from "./prover";
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

const vibeCheckStatus = ref<"failed_vibe" | "success_vibe" | null>(null);

const ecdsaPromiseDone = ref<boolean>(false);
const smilePromiseDone = ref<boolean>(false);
const erc20PromiseDone = ref<boolean>(false);

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

        proving: "proving",
        checking_tx: "proving",
        failed_at_proving: "proving",

        tx_success: "proving",
        tx_failure: "proving",
    } as any;
    if (statusToScreen[status.value] !== screen.value)
        screen.value = statusToScreen[status.value];
});

onMounted(async () => {
    // For some reason this fails if done too early
    await faceApi.nets.tinyFaceDetector.loadFromUri("/models");
});

const hasDetection = computed(() => lastDetections.value.length > 0);

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
    if (needWebAuthnCredentials()) {
        // Wait 2s
        await new Promise((resolve) => setTimeout(resolve, 2000));
        status.value = "authenticating";
        try {
            await registerWebAuthnIfNeeded();
            status.value = "authenticated";
        } catch (e) {
            console.error(e);
            error.value = `${e}`;
            status.value = "failed_authentication";
        }
    } else {
        status.value = "authenticated";
    }
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
    vibeCheckStatus.value = null;
    status.value = "checking_vibe";

    // TODO: do this for real
    if (Math.random() > 0.5) {
        setTimeout(() => {
            vibeCheckStatus.value = "failed_vibe";
            status.value = "failed_vibe";
        }, 1000);
    } else {
        setTimeout(() => {
            vibeCheckStatus.value = "success_vibe";
            status.value = "success_vibe";
        }, 1000);
    }
}

const signAndSend = async () => {
    ecdsaPromiseDone.value = false;
    smilePromiseDone.value = false;
    erc20PromiseDone.value = false;
    status.value = "proving";

    try {
        // Start locally proving that we are who we claim to be by signing the transaction hash
        // TODO: this is currently a random challenge
        const noirInput = await signChallengeWithWebAuthn();
        const ecdsaPromise = proveECDSA(noirInput);
        // Send the proof of smile to Giza or something
        const smilePromise = proveSmile();
        // Locally or backend prove an erc20 transfer
        const erc20Promise = proveERC20Transfer(/* Parse 'origin' from the noir proof ? */);

        ecdsaPromise.then(() => ecdsaPromiseDone.value = true);
        smilePromise.then(() => smilePromiseDone.value = true);
        erc20Promise.then(() => erc20PromiseDone.value = true);

        // Send the transaction
        await setupCosmos("http://localhost:26657");
        const resp = await broadcastTx(
            await ecdsaPromise,
            await smilePromise,
            await erc20Promise,
        );
        // Switch to waiter view
        status.value = "checking_tx";

        // Wait a bit and assume TX will be processed
        await new Promise((resolve) => setTimeout(resolve, 2000));

        // Check the status of the TX
        const txStatus = await checkTxStatus(resp.transactionHash);
        if (txStatus.status === "success") {
            status.value = "tx_success";
        } else {
            status.value = "tx_failure";
            error.value = txStatus.error || "Unknown error";
        }
    } catch (e) {
        console.error(e);
        error.value = `${e}`;
        status.value = "failed_at_proving";
    }
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
                    <i class="!mt-4 !m-auto !block spinner"></i>
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
        <template v-else>
            <!-- This case covers all of them because of the screenshotOutput canvas ref, which needs to have long enough lifetime -->
            <div v-if="screen === 'camera'">
                <div v-show="status === 'authenticated' || status === 'failed_camera'"
                    class="flex flex-col justify-center h-[400px] max-h-[50vh] max-w-[50rem] m-auto img-background p-10">
                    <div v-if="status === 'authenticated'">
                        <i class="!mt-4 !m-auto !block spinner"></i>
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
                    <button @click="takeScreenshot" :disabled="status !== 'camera_playing' || !hasDetection">Get
                        Tokens</button>
                </div>
            </div>
            <div v-show="screen !== 'camera'"> <!-- screenshotOutput is also why I'm using show and not if -->
                <div class="relative flex justify-center">
                    <canvas :class="`mirror rounded overflow-hidden ${vibeCheckStatus}`"
                        ref="screenshotOutput"></canvas>
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
                        <div v-else-if="screen === 'proving' && status !== 'failed_at_proving'"
                            class="text-white p-10 bg-black bg-opacity-50 rounded-xl flex flex-col gap-2">
                            <p class="flex items-center">Generating ECDSA signature proof:
                                <i v-if="!ecdsaPromiseDone" class="spinner"></i>
                                <span v-else>✅</span>
                                <span class="text-sm mt-1 text-opacity-80 italic">(this takes a while)</span>
                            </p>
                            <p class="flex items-center">Generating proof of smile: <i v-if="!smilePromiseDone"
                                    class="spinner"></i><span v-else>✅</span></p>
                            <p class="flex items-center">Generating ERC20 claim proof: <i v-if="!erc20PromiseDone"
                                    class="spinner"></i><span v-else>✅</span></p>
                            <p class="flex items-center">Sending TX: <i v-if="status === 'proving'"
                                    class="spinner"></i><span v-else>✅</span></p>
                            <div v-if="status === 'checking_tx'" class="flex flex-col justify-center items-center my-8">
                                <i class="spinner"></i>
                                <p class="italic">...TX sent, checking status...</p>
                            </div>
                            <div v-if="status === 'tx_success'" class="flex flex-col justify-center items-center my-8">
                                <p class="text-center font-semibold font-anton uppercase mb-2">TX successful</p>
                            </div>
                            <div v-if="status === 'tx_failure'" class="flex flex-col justify-center items-center my-8">
                                <p class="text-center font-semibold font-anton uppercase mb-2">TX failed</p>
                                <p class="text-center text-sm font-mono">{{ error }}</p>
                            </div>
                        </div>
                        <div v-else-if="status === 'failed_at_proving'"
                            class="text-white p-10 bg-black bg-opacity-50 rounded-xl flex flex-col gap-2">
                            <p class="text-center font-semibold font-anton uppercase mb-2">An error occured</p>
                            <p class="text-center text-sm font-mono">{{ error }}</p>
                        </div>
                    </div>
                </div>
                <div class="flex justify-center my-8">
                    <button @click="signAndSend"
                        :disabled="status !== 'failed_vibe' && status !== 'success_vibe' && status !== 'failed_at_proving'">Send
                        TX</button>
                </div>
            </div>
        </template>
    </div>
</template>

<style scoped>
.img-background {
    background-image: url("./assets/image_satellite.jpg");
    background-size: cover;
    background-position: center;
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

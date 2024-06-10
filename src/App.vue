<script setup lang="ts">
import * as faceApi from "face-api.js";
import { onMounted, ref } from "vue";

// resize the overlay canvas to the input dimensions
const canvasOutput = ref<HTMLCanvasElement | null>(null);
const videoFeed = ref<HTMLVideoElement | null>(null);

const detectionTimer = ref<unknown | null>(null);

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
                const detections = await faceApi.detectAllFaces(videoFeed.value!, new faceApi.TinyFaceDetectorOptions())
                const resizedDetections = faceApi.resizeResults(detections, displaySize)
                faceApi.draw.drawDetections(canvasOutput.value!, resizedDetections)
            }, 1000);
        })
        .catch((err) => {
            console.error(`An error occurred: ${err}`);
        });
});
</script>

<template>
    <div class="container m-auto">
        <h1 class="text-center my-4">Vibe Check</h1>
        <h3 class="text-center my-4">Hylé</h3>
        <div class="flex justify-center">
            <div class="relative">
                <video class="" ref="videoFeed" autoplay></video>
                <canvas class="absolute top-0" ref="canvasOutput"></canvas>
            </div>
        </div>
        <div class="flex justify-center my-8">
            <button @click="console.log('Vibe Check')">Claim token</button>
        </div>
    </div>
</template>

<style>
h1 {
    @apply text-4xl;
}

button {
    @apply bg-blue-500 text-white font-bold py-2 px-4 rounded;
}
</style>

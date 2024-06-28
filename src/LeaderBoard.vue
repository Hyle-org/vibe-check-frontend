<script setup lang="ts">
import { computed } from "vue";
import Logo from "./assets/Hyle_logo.svg";
import { SmileTokenBalances } from "./SmileTokenIndexer";

const sortedBalances = computed(() => {
    return Object.entries(SmileTokenBalances.value).sort((a, b) => b[1] - a[1]);
});
</script>

<template>
    <div class="container m-auto">
        <h1 class="text-center my-4">Vibe Check</h1>
        <h3 class="text-center my-4"><img :src="Logo" alt="Hylé logo" class="h-10 m-auto"></img></h3>

        <div>
            <p v-for="balance in sortedBalances" :key="balance[0]">{{ balance[0] }}: {{ balance[1] }}</p>
        </div>
    </div>
</template>

<style></style>

<script setup lang="ts">
import Logo from "./assets/Hyle_logo.svg";
import { GetAllContractRegistrations } from "./indexer";

const contracts = GetAllContractRegistrations();

</script>

<template>
    <div class="container m-auto">
        <h1 class="text-center my-4">Vibe Check</h1>
        <h3 class="text-center my-4"><img :src="Logo" alt="Hylé logo" class="h-10 m-auto"></img></h3>

        <div>
            <p v-for="contract in contracts" :key="contract.txhash">{{ contract }}</p>
        </div>
    </div>
</template>

<style></style>

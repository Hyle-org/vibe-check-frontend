export const network = import.meta.env.DEV ? "localhost" : "devnet";

export const getNetworkApiUrl = () => {
    return {
        localhost: "http://localhost:1317",
        devnet: "https://api.devnet.hyle.eu",
    }[network];
};

export const getNetworkRpcUrl = () => {
    return {
        localhost: "http://localhost:26657",
        devnet: "https://rpc.devnet.hyle.eu",
    }[network];
};

export const getNetworkWebsocketUrl = () => {
    return {
        localhost: "ws://localhost:26657/websocket",
        devnet: "wss://rpc.devnet.hyle.eu/websocket",
    }[network];
};

export const getCairoProverUrl = () => {
    return {
        localhost: "http://localhost:3000",
        devnet: "https://vibe.hyle.eu/cairo-prover",
    }[network];
};

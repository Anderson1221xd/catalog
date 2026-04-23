import { createClient } from "redis";

export const handler = async (event) => {
    const rawUrl = process.env.REDIS_URL.trim().replace('redis://', '').replace('rediss://', '');
    const client = createClient({ 
        url: `rediss://${rawUrl}:6379` 
    });

    try {
        await client.connect();
        const data = await client.get("current_catalog");

        return {
            statusCode: 200,
            headers: { "Access-Control-Allow-Origin": "*" },
            body: data ? data : JSON.stringify({ message: "No hay datos aún" })
        };
    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message })
        };
    } finally {
        if (client.isOpen) await client.quit();
    }
};
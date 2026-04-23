import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { createClient } from "redis";

const s3 = new S3Client({});

export const handler = async (event) => {
    const rawUrl = process.env.REDIS_URL.trim().replace('redis://', '').replace('rediss://', '');
    
    const redisClient = createClient({ 
        url: `rediss://${rawUrl}:6379`, 
        socket: { connectTimeout: 10000 }
    });

    redisClient.on('error', err => console.log('Redis Client Error:', err));

    try {
        let csvContent = event.body; 
        if (!csvContent) throw new Error("Cuerpo vacío");

        // --- BLOQUE DE LIMPIEZA: Extraer CSV del Multipart Form-Data ---
        // Si el body contiene el boundary del navegador, lo limpiamos
        if (csvContent.includes("Content-Type: text/csv")) {
            const lines = csvContent.split('\r\n');
            // El contenido real empieza después de la primera línea vacía
            const startIndex = lines.findIndex(line => line === "") + 1;
            // Y termina antes del último boundary
            const endIndex = lines.findLastIndex(line => line.startsWith("------"));
            csvContent = lines.slice(startIndex, endIndex).join('\n').trim();
        }

        // 1. Guardar el archivo limpio en S3
        await s3.send(new PutObjectCommand({
            Bucket: process.env.BUCKET_NAME,
            Key: `catalogos/catalog-${Date.now()}.csv`,
            Body: csvContent
        }));

        // 2. Conectar a Redis
        await redisClient.connect();

        // 3. Procesar datos (Ahora con el contenido limpio)
        const lines = csvContent.trim().split("\n");
        const headers = lines[0].split(",");
        
        const catalogData = lines.slice(1).map(line => {
            const values = line.split(",");
            let obj = {};
            headers.forEach((header, i) => {
                // Limpiamos espacios y posibles retornos de carro (\r)
                const key = header.trim();
                const value = values[i]?.trim();
                obj[key] = value;
            });
            return obj;
        });

        // 4. Guardar el JSON limpio en Redis
        await redisClient.set("current_catalog", JSON.stringify(catalogData));

        return {
            statusCode: 200,
            headers: { 
                "Access-Control-Allow-Origin": "*",
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ 
                message: "Catálogo cargado y limpiado", 
                count: catalogData.length 
            })
        };

    } catch (error) {
        console.error("ERROR DETECTADO:", error);
        return {
            statusCode: 500,
            headers: { "Access-Control-Allow-Origin": "*" },
            body: JSON.stringify({ error: error.message })
        };
    } finally {
        if (redisClient.isOpen) await redisClient.quit();
    }
};
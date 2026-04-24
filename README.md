# Microservicio de Catálogo de Servicios

Este repositorio contiene la lógica del microservicio encargado de proveer el catálogo de servicios a la interfaz de usuario. Está optimizado para alta disponibilidad y baja latencia mediante el uso de caché.

## 🚀 Arquitectura y Tecnologías

* **Runtime:** Node.js (AWS Lambda)
* **Capa de Caché:** Amazon ElastiCache (Redis)
* **Base de Datos:** Amazon DynamoDB (Fallback)
* **Red:** Desplegado dentro de una VPC privada para garantizar conectividad segura.


Para garantizar tiempos de respuesta mínimos frente a múltiples usuarios concurrentes, este servicio implementa el patrón **Cache-Aside**:

1. **Conexión Privada:** El servicio establece conexión con el clúster de ElastiCache a través del **puerto 6379** dentro de la VPC.
2. **Hit de Caché:** Ante una petición del cliente, primero verifica si el catálogo existe en Redis. Si está, lo devuelve inmediatamente.
3. **Miss de Caché:** Si Redis no tiene la información (o expiró), la Lambda consulta la base de datos origen, guarda el resultado en Redis para futuras consultas, y finalmente responde al cliente.

## 🔧 Configuración y Variables de Entorno

El servicio requiere las siguientes variables de entorno para su correcto funcionamiento en AWS:


## 🛡️ Seguridad (Security Groups)

La comunicación con Redis está protegida. El **Security Group** asociado al clúster de ElastiCache posee una regla de entrada (Inbound Rule) configurada para permitir tráfico TCP por el puerto `6379` únicamente desde el origen autorizado (la subred de esta Lambda).

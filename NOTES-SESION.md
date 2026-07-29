# Notas de sesión — bloqueos y decisiones que no me corresponden

Sesión del **2026-07-29**. Lo que quedó trabado, por qué, y cuál es la única acción que lo desbloquea.
Nada de esto frenó el trabajo: seguí con la tarea siguiente en cada caso.

---

## 1. No pude probar el camino real con un modelo (Ollama no está instalado)

**Estado:** `which ollama` → no instalado. `curl localhost:11434` → sin respuesta.

Los adapters de `ollama` y `nim` están testeados con `fetch` mockeado: se verifica la URL, el body, los headers, el mapeo de la respuesta y el manejo de errores. Eso prueba que **el adapter está bien escrito**, pero no prueba que **un modelo real de 3B devuelva JSON usable** para estos prompts. Es una diferencia importante y no la quiero tapar.

**Por qué no lo instalé solo:** bajar Ollama + un modelo son varios GB en su disco y es una decisión de entorno, no de código. No es lo mismo que instalar una dependencia de npm.

**Acción que lo desbloquea (una):** decir "instalá Ollama". Yo corro la instalación, bajo `llama3.2`, levanto el server y hago el smoke test comparando la salida del modelo contra la del parser determinístico sobre los mismos 10 mensajes.

---

## 2. Tampoco pude probar NIM (no hay API key)

**Estado:** `NVIDIA_NIM_API_KEY` vacía.

El guard de producción sí está testeado (no sale a la red y tira el error correcto). Lo que falta es una llamada real en dev para confirmar que `meta/llama-3.1-8b-instruct` respeta el formato JSON del prompt.

**Por qué no la saqué solo:** requiere login en `build.nvidia.com` con su cuenta — usuario, password y probablemente verificación. Es exactamente el tipo de paso que no puedo automatizar.

**Acción que lo desbloquea (una):** sacar la key en build.nvidia.com y pegarla. Yo la pongo en `.env` (que está gitignorado) y corro el smoke test. **Recordatorio:** solo con mensajes de prueba, nunca con texto de un cliente real — el ToS 3.3 les permite entrenar con lo que se manda.

---

## 3. `render.yaml` apunta a una rama que no existe

**Estado:** `render.yaml` dice `branch: main`. El repo está en `master`.

Es el mismo bug que tenía el CI antes de esta sesión. Si el servicio de Render se creó desde este blueprint, el auto-deploy está mirando una rama inexistente y **nunca se disparó**.

**Por qué no lo cambié:** es el pipeline de deploy. Corregirlo a `master` probablemente dispare un deploy a producción del endpoint nuevo, y publicar no es una decisión que tome por mi cuenta. Además no sé si el servicio en Render se configuró desde el blueprint o a mano en el dashboard — si fue a mano, este archivo no cambia nada y el fix real está en la UI.

**Acción que lo desbloquea:** confirmarme si querés que turnero-api deployee desde `master`. Con eso corrijo el archivo; si además hay que tocar el dashboard, te digo exactamente qué campo.

---

## 4. Decisión de producto: ¿va IA en producción, y con qué?

Hoy producción usa `rules` (el default). Eso es correcto y seguro, y no es un placeholder: el parser determinístico resuelve los casos frecuentes, no cuesta nada y no se cae.

Pero la decisión de si el producto vendible lleva un LLM real, y cuál, es tuya y tiene consecuencias de plata:

- **Ollama en el server** — gratis por token, pero el free tier de Render (512 MB RAM) no corre un modelo local. Necesitás un plan pago o una VPS.
- **Proveedor pago** (Claude, Gemini, Groq) — centavos por consulta, cero infra. El adapter es ~40 líneas, igual a los dos que ya están.
- **Quedarse en `rules`** — cero costo, cero infra. Pierde los pedidos con redacción rara.

**No lo decidí yo** porque involucra costo recurrente. Mi lectura: empezar en `rules` y agregar un proveedor pago recién cuando un cliente real se queje de que no le entiende. La arquitectura ya está lista para ese cambio — es una env var.

---

## 5. Lo que NO toqué a propósito

- **WhatsApp.** No mandé ni un mensaje y no escribí integración. Requiere la API paga de WhatsApp Business y mueve datos de clientes reales. El endpoint `/api/intents/parse` es agnóstico del canal: cuando exista el canal, se conecta ahí.
- **Datos de clientes reales.** Todo lo que corrió fue contra `mongodb-memory-server` y mocks.
- **`POST /api/intents/book`.** Cerrar el círculo (parsear → reservar) es la pieza siguiente y está diseñada para entrar sin refactor, pero reservar de verdad desde texto libre necesita una decisión sobre confirmación explícita del cliente antes de escribir en la agenda. Lo dejé anotado en los próximos pasos del README.

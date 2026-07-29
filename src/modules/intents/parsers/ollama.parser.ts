import env from '../../../config/env'
import { IntentContext, IntentParser, ParsedIntent } from '../intent.types'
import {
  IntentParserError,
  SYSTEM_PROMPT,
  buildUserPrompt,
  postJson,
  toIntent,
} from './llm.shared'

// Modelo local via Ollama. Es la opcion preferida para el modo con IA: corre
// en la maquina, no tiene costo por token, no manda el mensaje del cliente a
// ningun tercero y no tiene restriccion de uso en produccion.

interface OllamaChatResponse {
  message?: { content?: string }
}

export class OllamaIntentParser implements IntentParser {
  readonly name = 'ollama'

  constructor(
    private readonly baseUrl: string = env.ollamaUrl,
    private readonly model: string = env.ollamaModel,
    private readonly timeoutMs: number = env.intentTimeoutMs
  ) {}

  async parseIntent(text: string, context: IntentContext = {}): Promise<ParsedIntent> {
    let response: OllamaChatResponse

    try {
      response = (await postJson(
        `${this.baseUrl.replace(/\/$/, '')}/api/chat`,
        {
          model: this.model,
          stream: false,
          // Ollama sabe forzar salida JSON, y temperatura 0 para que el mismo
          // mensaje no se lea distinto en dos pedidos seguidos.
          format: 'json',
          options: { temperature: 0 },
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: buildUserPrompt(text, context) },
          ],
        },
        {},
        this.timeoutMs
      )) as OllamaChatResponse
    } catch (error) {
      throw new IntentParserError(this.name, (error as Error).message)
    }

    const content = response.message?.content
    if (!content) throw new IntentParserError(this.name, 'respuesta sin contenido')

    return toIntent(content, text, context)
  }
}

export default new OllamaIntentParser()

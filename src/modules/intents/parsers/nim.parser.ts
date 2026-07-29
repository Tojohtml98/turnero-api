import env from '../../../config/env'
import { IntentContext, IntentParser, ParsedIntent } from '../intent.types'
import {
  IntentParserError,
  SYSTEM_PROMPT,
  buildUserPrompt,
  postJson,
  toIntent,
} from './llm.shared'

// NVIDIA NIM, SOLO PARA DESARROLLO.
//
// El free tier de build.nvidia.com se rige por las NVIDIA API Trial Terms of
// Service, que en 1.2 y 1.4 dicen textual que el acceso es "for limited trial
// purposes only and without use of the API Service or Generated Content in
// production" y que sin Subscription "you may only use the API Service for
// internal testing and evaluation purposes, not in production". Ademas 3.3
// permite a NVIDIA usar el contenido enviado para entrenar sus modelos, o sea
// que el mensaje de un cliente real no puede pasar por aca.
//
// Por eso este parser se niega a arrancar con NODE_ENV=production. El guard es
// parte del contrato, no una precaucion opcional: en produccion va Ollama (o
// un proveedor pago), y este queda como modelo de prueba en dev.

interface OpenAiCompatibleResponse {
  choices?: { message?: { content?: string } }[]
}

export class NimIntentParser implements IntentParser {
  readonly name = 'nim'

  constructor(
    private readonly apiKey: string = env.nimApiKey,
    private readonly baseUrl: string = env.nimBaseUrl,
    private readonly model: string = env.nimModel,
    private readonly timeoutMs: number = env.intentTimeoutMs,
    private readonly nodeEnv: string = env.nodeEnv
  ) {}

  private assertNotProduction(): void {
    if (this.nodeEnv === 'production') {
      throw new IntentParserError(
        this.name,
        'el free tier de NVIDIA NIM prohibe uso en produccion (Trial ToS 1.2 y 1.4). Usa INTENT_PARSER=ollama o rules.'
      )
    }
  }

  async parseIntent(text: string, context: IntentContext = {}): Promise<ParsedIntent> {
    this.assertNotProduction()
    if (!this.apiKey) throw new IntentParserError(this.name, 'falta NVIDIA_NIM_API_KEY')

    let response: OpenAiCompatibleResponse

    try {
      response = (await postJson(
        `${this.baseUrl.replace(/\/$/, '')}/chat/completions`,
        {
          model: this.model,
          temperature: 0,
          max_tokens: 200,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: buildUserPrompt(text, context) },
          ],
        },
        { Authorization: `Bearer ${this.apiKey}` },
        this.timeoutMs
      )) as OpenAiCompatibleResponse
    } catch (error) {
      throw new IntentParserError(this.name, (error as Error).message)
    }

    const content = response.choices?.[0]?.message?.content
    if (!content) throw new IntentParserError(this.name, 'respuesta sin contenido')

    return toIntent(content, text, context)
  }
}

export default new NimIntentParser()

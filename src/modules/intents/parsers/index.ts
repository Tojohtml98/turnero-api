import env from '../../../config/env'
import { IntentContext, IntentParser, ParsedIntent } from '../intent.types'
import rulesParser, { RulesIntentParser } from './rules.parser'
import ollamaParser, { OllamaIntentParser } from './ollama.parser'
import nimParser, { NimIntentParser } from './nim.parser'

export { RulesIntentParser, OllamaIntentParser, NimIntentParser }

// Un motor con IA puede estar caido, sin modelo descargado o sin API key. El
// texto del cliente no se pierde por eso: se prueban los motores en orden y
// el ultimo es siempre el deterministico, que no puede fallar por red.
export class ChainIntentParser implements IntentParser {
  readonly name: string

  constructor(private readonly chain: IntentParser[]) {
    this.name = chain.map((p) => p.name).join('>')
  }

  async parseIntent(text: string, context: IntentContext = {}): Promise<ParsedIntent> {
    for (const [index, parser] of this.chain.entries()) {
      const isLast = index === this.chain.length - 1
      try {
        return await parser.parseIntent(text, context)
      } catch (error) {
        if (isLast) throw error
        // eslint-disable-next-line no-console
        console.warn(`[intent] ${parser.name} fallo, pasando al siguiente:`, (error as Error).message)
      }
    }
    return rulesParser.parseIntent(text, context)
  }
}

const isProduction = (): boolean => env.nodeEnv === 'production'

// `auto` arma la cadena con lo que este realmente configurado: Ollama si hay
// URL, despues NIM si hay key y no estamos en produccion, y siempre el
// deterministico al final como piso.
const buildAutoChain = (): IntentParser => {
  const chain: IntentParser[] = []
  if (env.ollamaUrl) chain.push(ollamaParser)
  if (env.nimApiKey && !isProduction()) chain.push(nimParser)
  chain.push(rulesParser)
  return chain.length === 1 ? rulesParser : new ChainIntentParser(chain)
}

/**
 * Devuelve el parser configurado. `INTENT_PARSER` acepta:
 *   rules  (default) — deterministico, sin red
 *   ollama           — modelo local
 *   nim              — NVIDIA NIM, solo dev (ver nim.parser.ts)
 *   auto             — ollama -> nim -> rules, segun lo que este configurado
 */
export const getIntentParser = (name: string = env.intentParser): IntentParser => {
  switch (name) {
    case 'ollama':
      return ollamaParser
    case 'nim':
      return nimParser
    case 'auto':
      return buildAutoChain()
    case 'rules':
      return rulesParser
    default:
      // eslint-disable-next-line no-console
      console.warn(`[intent] INTENT_PARSER="${name}" no existe, usando rules`)
      return rulesParser
  }
}

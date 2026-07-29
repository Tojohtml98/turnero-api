import { OllamaIntentParser } from '../parsers/ollama.parser'
import { NimIntentParser } from '../parsers/nim.parser'
import { ChainIntentParser, getIntentParser } from '../parsers'
import { RulesIntentParser } from '../parsers/rules.parser'
import { extractJson, toIntent } from '../parsers/llm.shared'
import { IntentParser, ParsedIntent } from '../intent.types'

const now = new Date(2026, 6, 15, 10, 0)
const context = { serviceNames: ['Corte de pelo'], now }

// Ningun test toca la red: se reemplaza global.fetch por un doble que
// devuelve lo que necesitamos. Los adapters solo aportan el pedido HTTP, y
// eso es exactamente lo que se verifica aca.
const mockFetch = (payload: unknown, ok = true) => {
  const fetchMock = jest.fn().mockResolvedValue({
    ok,
    status: ok ? 200 : 500,
    statusText: ok ? 'OK' : 'Internal Server Error',
    json: async () => payload,
  })
  global.fetch = fetchMock as unknown as typeof fetch
  return fetchMock
}

const originalFetch = global.fetch

afterEach(() => {
  global.fetch = originalFetch
  jest.restoreAllMocks()
})

describe('extractJson', () => {
  it('parses a bare JSON object', () => {
    expect(extractJson('{"service":"Corte"}')).toEqual({ service: 'Corte' })
  })

  it('parses JSON wrapped in a fenced block', () => {
    expect(extractJson('```json\n{"service":"Corte"}\n```')).toEqual({ service: 'Corte' })
  })

  it('parses JSON with a sentence in front of it', () => {
    expect(extractJson('Claro! Aca va: {"service":"Corte"} espero que sirva')).toEqual({
      service: 'Corte',
    })
  })

  it('returns null for text without JSON', () => {
    expect(extractJson('no entiendo el pedido')).toBeNull()
  })

  it('returns null for malformed JSON', () => {
    expect(extractJson('{"service": }')).toBeNull()
  })

  it('returns null for a JSON array', () => {
    expect(extractJson('[1,2,3]')).toBeNull()
  })
})

describe('toIntent', () => {
  it('maps a well-formed model answer', () => {
    const raw = '{"service":"Corte de pelo","date":"2026-07-16","time":"15:00"}'

    expect(toIntent(raw, 'texto original', context)).toEqual({
      service: 'Corte de pelo',
      date: '2026-07-16',
      time: '15:00',
    })
  })

  it('rescues a relative date the model failed to normalize', () => {
    const raw = '{"service":"Corte","date":"manana","time":"3 de la tarde"}'

    expect(toIntent(raw, 'texto', context)).toEqual({
      service: 'Corte',
      date: '2026-07-16',
      time: '15:00',
    })
  })

  it('nulls an impossible date instead of passing it through', () => {
    expect(toIntent('{"date":"2026-13-45"}', 'texto', context).date).toBeNull()
  })

  it('nulls a hallucinated field type', () => {
    expect(toIntent('{"service":{"nombre":"Corte"},"time":99}', 'texto', context)).toEqual({
      service: null,
      date: null,
      time: null,
    })
  })

  it('returns an empty intent when there is no JSON at all', () => {
    expect(toIntent('el modelo se fue por las ramas', 'texto', context)).toEqual({
      service: null,
      date: null,
      time: null,
    })
  })
})

describe('OllamaIntentParser', () => {
  it('posts to /api/chat and maps the answer', async () => {
    const fetchMock = mockFetch({
      message: { content: '{"service":"Corte de pelo","date":"2026-07-16","time":"15:00"}' },
    })

    const parser = new OllamaIntentParser('http://localhost:11434', 'llama3.2', 5000)
    const intent = await parser.parseIntent('turno de corte manana a las 3', context)

    expect(intent).toEqual({ service: 'Corte de pelo', date: '2026-07-16', time: '15:00' })

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('http://localhost:11434/api/chat')
    const body = JSON.parse((init as RequestInit).body as string)
    expect(body.model).toBe('llama3.2')
    expect(body.stream).toBe(false)
    expect(body.format).toBe('json')
    expect(body.options.temperature).toBe(0)
    // El prompt tiene que llevar la fecha de hoy y el catalogo, si no el
    // modelo no puede resolver "manana" ni elegir un servicio real.
    expect(body.messages[1].content).toContain('2026-07-15')
    expect(body.messages[1].content).toContain('Corte de pelo')
  })

  it('does not double up the slash when the URL ends with one', async () => {
    const fetchMock = mockFetch({ message: { content: '{}' } })

    await new OllamaIntentParser('http://localhost:11434/', 'llama3.2', 5000).parseIntent('x')

    expect(fetchMock.mock.calls[0][0]).toBe('http://localhost:11434/api/chat')
  })

  it('throws a tagged error on an HTTP failure', async () => {
    mockFetch({}, false)

    await expect(
      new OllamaIntentParser('http://localhost:11434', 'llama3.2', 5000).parseIntent('x')
    ).rejects.toThrow(/\[ollama\]/)
  })

  it('throws when the answer has no content', async () => {
    mockFetch({ message: {} })

    await expect(
      new OllamaIntentParser('http://localhost:11434', 'llama3.2', 5000).parseIntent('x')
    ).rejects.toThrow(/sin contenido/)
  })
})

describe('NimIntentParser', () => {
  const baseUrl = 'https://integrate.api.nvidia.com/v1'

  it('refuses to run in production (Trial ToS 1.2 / 1.4)', async () => {
    const fetchMock = mockFetch({})
    const parser = new NimIntentParser('key', baseUrl, 'meta/llama-3.1-8b-instruct', 5000, 'production')

    await expect(parser.parseIntent('turno de corte manana')).rejects.toThrow(/produccion/)
    // Y no llega a salir a la red.
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('runs in development', async () => {
    const fetchMock = mockFetch({
      choices: [{ message: { content: '{"service":"Corte de pelo","date":"2026-07-16","time":"15:00"}' } }],
    })

    const parser = new NimIntentParser('nvapi-test', baseUrl, 'meta/llama-3.1-8b-instruct', 5000, 'development')
    const intent = await parser.parseIntent('turno de corte manana a las 3', context)

    expect(intent).toEqual({ service: 'Corte de pelo', date: '2026-07-16', time: '15:00' })

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe(`${baseUrl}/chat/completions`)
    const headers = (init as RequestInit).headers as Record<string, string>
    expect(headers.Authorization).toBe('Bearer nvapi-test')
  })

  it('throws when the API key is missing', async () => {
    const fetchMock = mockFetch({})
    const parser = new NimIntentParser('', baseUrl, 'meta/llama-3.1-8b-instruct', 5000, 'development')

    await expect(parser.parseIntent('x')).rejects.toThrow(/NVIDIA_NIM_API_KEY/)
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

describe('ChainIntentParser', () => {
  const failing: IntentParser = {
    name: 'failing',
    parseIntent: () => Promise.reject(new Error('caido')),
  }

  it('falls through to the next parser when one fails', async () => {
    const chain = new ChainIntentParser([failing, new RulesIntentParser()])
    jest.spyOn(console, 'warn').mockImplementation(() => {})

    const intent = await chain.parseIntent('turno de corte manana a las 3', context)

    expect(intent.service).toBe('Corte de pelo')
    expect(intent.date).toBe('2026-07-16')
  })

  it('reports the chain in its name', () => {
    expect(new ChainIntentParser([failing, new RulesIntentParser()]).name).toBe('failing>rules')
  })

  it('does not call the next parser when the first one works', async () => {
    const working: IntentParser = {
      name: 'working',
      parseIntent: (): Promise<ParsedIntent> =>
        Promise.resolve({ service: 'Barba', date: null, time: null }),
    }
    const second = new RulesIntentParser()
    const spy = jest.spyOn(second, 'parseIntent')

    const intent = await new ChainIntentParser([working, second]).parseIntent('x', context)

    expect(intent.service).toBe('Barba')
    expect(spy).not.toHaveBeenCalled()
  })

  it('propagates the error when every parser fails', async () => {
    jest.spyOn(console, 'warn').mockImplementation(() => {})

    await expect(new ChainIntentParser([failing, failing]).parseIntent('x')).rejects.toThrow('caido')
  })
})

describe('getIntentParser', () => {
  it('returns the deterministic parser by default', () => {
    expect(getIntentParser().name).toBe('rules')
  })

  it('resolves each parser by name', () => {
    expect(getIntentParser('rules').name).toBe('rules')
    expect(getIntentParser('ollama').name).toBe('ollama')
    expect(getIntentParser('nim').name).toBe('nim')
  })

  it('falls back to rules for an unknown name', () => {
    jest.spyOn(console, 'warn').mockImplementation(() => {})
    expect(getIntentParser('gpt-inventado').name).toBe('rules')
  })

  it('auto without any provider configured is just rules', () => {
    // En el entorno de test no hay OLLAMA_URL ni NVIDIA_NIM_API_KEY.
    expect(getIntentParser('auto').name).toBe('rules')
  })
})

export interface TokenType {
  name: string
  label?: string
  ignore?: boolean
  match(text: string): number | undefined | null
}

export class SyntaxError extends Error {
  name = 'SyntaxError'

  static unexpected (got: string | TokenType = 'EOF', expected?: string | TokenType) {
    if (typeof got === 'object') {
      got = got.label ?? got.name
    }

    if (typeof expected === 'object') {
      expected = expected.label ?? expected.name
    }

    if (expected) {
      return new SyntaxError(`Era esperado ${expected} mas foi encontrado ${got}`)
    }

    return new SyntaxError(`Token inesperado ${got}`)
  }
}

export namespace TokenType {
  export function pattern(exp: RegExp) {
    return (text: string) => {
      const match = text.match(exp)
      return match?.[0].length
    }
  }

  export function literal(pattern: string) {
    return (text: string) => {
      if (text.startsWith(pattern)) {        
        return pattern.length
      }
    }
  }

  export function match(pattern: string | RegExp) {    
    return typeof pattern === 'string' ? TokenType.literal(pattern) : TokenType.pattern(pattern)
  }

  export function of(name: string, pattern: string | RegExp, options?: Partial<Omit<TokenType, 'name' | 'match'>>): TokenType {
    return {
      name,
      label: typeof pattern === 'string' ? JSON.stringify(pattern) : name,
      match: TokenType.match(pattern),
      ...options,
    }
  }
}

export interface Localization {
  start: number
  end: number
}

export interface Token {
  type: TokenType
  token: string
}

export class Lexer {
  queue: Token[] = []

  get lookahead(): Token | null {
    return this.read(1)[0]
  }

  consume(count: number = 1) {
    if (count > this.queue.length) {
      this.read(count - this.queue.length)
    }

    return this.queue.splice(0, count)
  }

  read(count: number) {
    if (count > this.queue.length) {
      for (let i = 0; i < count; i++) {
        const result = this.tokens.next().value

        if (result) {
          this.queue.push(result)
        }
      }
    }

    return this.queue.slice(0, count)
  }

  lookaheadIs(type: TokenType) {    
    return this.lookahead?.type === type
  }

  match(type: TokenType, required?: true): Token
  match(type: TokenType, required: false): Token | null
  match(type: TokenType, required = true) {
    const lookahead = this.lookahead

    if (lookahead?.type === type) {
      this.consume()
      return lookahead
    }

    if (required) {
      throw SyntaxError.unexpected(lookahead?.type ?? 'EOF', type)
    }

    return null
  }

  constructor(private readonly tokens: Iterator<Token>) { }

  static fromString(dictionary: TokenType[], code: string): Lexer {
    return new Lexer(Lexer.tokenize(dictionary, code))
  }

  static * tokenize(dictionary: TokenType[], code: string): Generator<Token> {
    codeLoop:
    while (code.length) {
      for (const type of dictionary) {
        const result = type.match(code)

        if (result) {
          const token = code.substring(0, result)

          code = code.substring(result)

          if (!type.ignore) {
            yield {
              type,
              token
            }
          }

          continue codeLoop
        }
      }

      throw SyntaxError.unexpected(code[0])
    }
  }
}
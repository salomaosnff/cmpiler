import { TokenType } from "./lexer"

const Tokens: TokenType[] = []

const keywords = [
    'let',
    'const',
    'if',
    'else',
    'return',
    'true',
    'false',
    'infinity',
    'func',
    'for',
    'while',
    'with',
    'type',
    'loop',
    'break',
    'continue',
    'null',
    'import',
    'export',
    'as',
    'from',
    'of',
    'interface',
    'class',
    'extends',
    'implements',
    'new',
    'this',
    'public',
    'private',
    'protected',
    'static',
    'super',
    'operator',
    'call',
]

function token(name: string, pattern: string | RegExp, options?: Partial<Omit<TokenType, 'name' | 'match'>>): TokenType {
    const t = TokenType.of(name, pattern, options)

    Tokens.push(t)

    return t
}

// Comments
export const SingleLineComment = token('SingleLineCommentToken', /^\/\/.*/, {ignore: true})
export const MultiLineComment = token('MultiLineCommentToken', /^\/\*[\s\S]*?\*\//, {ignore: true})

// Literals
export const Keyword = token('KeywordToken', new RegExp(`^(${keywords.join('|')})`))
export const Number = token('NumberToken', /^\d+(\.\d+)?/)
export const String = token('StringToken', /^"([^"\\]|\\.)*"/)

// Identifiers
export const Identifier = token('IdentifierToken', /^[a-z_$][a-z0-9_$]*/i)

// Logical Operators
export const And = token('AndToken', '&&')
export const Or = token('OrToken', '||')

// Unary Operators
export const Not = token('NotToken', '!')

// Bitwise Operators
export const Ampersand = token('BitwiseAndToken', '&')
export const Pipe = token('Pipe', '|')
export const BitwiseXor = token('BitwiseXorToken', '^')
export const BitwiseNot = token('BitwiseNotToken', '~')
export const BitwiseLeftShift = token('BitwiseLeftShiftToken', '<<')
export const BitwiseRightShift = token('BitwiseRightShiftToken', '>>')

// Comparison Operators
export const Equal = token('EqualToken', '==')
export const NotEqual = token('NotEqualToken', '!=')
export const GreaterThanOrEqual = token('GreaterThanOrEqualToken', '>=')
export const GreaterThan = token('GreaterThanToken', '>')
export const LessThanOrEqual = token('LessThanOrEqualToken', '<=')
export const LessThan = token('LessThanToken', '<')

// Arithmetic Operators
export const Increment = token('IncrementToken', '++')
export const Plus = token('PlusToken', '+')
export const Decrement = token('DecrementToken', '--')
export const Minus = token('MinusToken', '-')
export const Power = token('PowerToken', '**')
export const Multiply = token('MultiplyToken', '*')
export const Divide = token('DivideToken', '/')
export const Modulo = token('ModuloToken', '%')

// Assignment Operators
export const Assign = token('AssignToken', '=')
export const PlusAssign = token('PlusAssignToken', '+=')
export const MinusAssign = token('MinusAssignToken', '-=')
export const MultiplyAssign = token('MultiplyAssignToken', '*=')
export const DivideAssign = token('DivideAssignToken', '/=')
export const ModuloAssign = token('ModuloAssignToken', '%=')

// Punctuation
export const LeftParenthesis = token('LeftParenthesisToken', '(')
export const RightParenthesis = token('RightParenthesisToken', ')')
export const LeftBrace = token('LeftBraceToken', '{')
export const RightBrace = token('RightBraceToken', '}')
export const LeftBracket = token('LeftBracketToken', '[')
export const RightBracket = token('RightBracketToken', ']')
export const Comma = token('CommaToken', ',')
export const Ellipsis = token('DotToken', '...')
export const Dot = token('DotToken', '.')
export const Semicolon = token('SemicolonToken', ';')
export const Colon = token('ColonToken', ':')
export const QuestionMark = token('QuestionMarkToken', '?')

// Whitespace
export const Whitespace = token('WhitespaceToken', /^\s+/, { ignore: true })

export default Tokens
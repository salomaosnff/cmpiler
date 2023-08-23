import { Lexer } from './lexer'
import { readFile } from 'fs/promises'
import { Parser } from './parser'
import Tokens from './dictionary'
import { Typechecker } from './typechecker'


async function main () {
    const lexer = Lexer.fromString(
        Object.values(Tokens),
        await readFile('./code.snff', 'utf-8')
    )

    const parser = new Parser(lexer)
    const ast = parser.Program()
    
    const typechecker = new Typechecker()

    console.dir(typechecker.check(ast), { depth: null })
    // console.dir(ast, { depth: null })
}

main()
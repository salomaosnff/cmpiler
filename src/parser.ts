import * as Tokens from "./dictionary";
import { Lexer, SyntaxError } from "./lexer";

export class Parser {
  constructor(private readonly lexer: Lexer) { }

  NumberLiteral() {
    if (!this.lexer.lookaheadIs(Tokens.Number)) {
      return
    }

    const { token } = this.lexer.match(Tokens.Number)

    return {
      type: 'NumberLiteral',
      value: Number(token),
      token
    }
  }

  StringLiteral() {
    if (this.lexer.lookaheadIs(Tokens.String)) {
      const [stringToken] = this.lexer.consume()
      return {
        type: 'StringLiteral',
        token: stringToken.token,
        value: stringToken.token.slice(1, -1)
      }
    }
  }

  BooleanLiteral() {
    const booleanLiteral = this.Keyword('true') ?? this.Keyword('false')

    if (!booleanLiteral) {
      return
    }

    return {
      type: 'BooleanLiteral',
      token: booleanLiteral.name,
      value: booleanLiteral.name === 'true'
    }
  }

  NullLiteral() {
    const nullLiteral = this.Keyword('null')

    if (!nullLiteral) {
      return
    }

    return {
      type: 'NullLiteral',
      token: nullLiteral.name,
      value: null
    }
  }

  InfinityLiteral() {
    const infinityLiteral = this.Keyword('infinity')

    if (!infinityLiteral) {
      return
    }

    return {
      type: 'InfinityLiteral',
      token: infinityLiteral.name,
      value: Infinity
    }
  }

  VoidLiteral() {
    const voidLiteral = this.Keyword('void')

    if (!voidLiteral) {
      return
    }

    return {
      type: 'VoidLiteral',
      token: voidLiteral.name,
      value: void 0
    }
  }

  ArrayLiteral() {
    if (!this.lexer.lookaheadIs(Tokens.LeftBracket)) {
      return
    }

    this.lexer.consume()

    const elements: any[] = []

    while (!this.lexer.lookaheadIs(Tokens.RightBracket)) {
      const expression = this.Expression()

      elements.push(expression ?? null)

      if (this.lexer.lookaheadIs(Tokens.Comma)) {
        this.lexer.consume()
        continue
      }
    }

    this.lexer.match(Tokens.RightBracket)

    return {
      type: 'ArrayLiteral',
      elements,
    }
  }

  MapLiteral() {
    if (!this.lexer.lookaheadIs(Tokens.LeftBrace)) {
      return
    }

    this.lexer.consume()

    const entries: any[] = []

    while (!this.lexer.lookaheadIs(Tokens.RightBrace)) {
      let key = this.Identifier() ?? this.StringLiteral()

      if (!key) {
        this.lexer.match(Tokens.LeftBracket)
        key = this.Expression()
        this.lexer.match(Tokens.RightBracket)
      }

      this.lexer.match(Tokens.Colon)

      const value = this.Expression()

      if (!value) {
        throw SyntaxError.unexpected(this.lexer.lookahead?.type, 'Expression')
      }

      entries.push({
        type: 'MapLiteralElement',
        key,
        value
      })

      if (this.lexer.lookaheadIs(Tokens.Comma)) {
        this.lexer.consume()
        continue
      }

      break
    }

    this.lexer.match(Tokens.RightBrace)

    return {
      type: 'MapLiteral',
      entries,
    }
  }

  PowerOperation() {
    let left: any = this.UnaryOperation()

    while (this.lexer.lookaheadIs(Tokens.Power)) {
      this.lexer.consume()

      const right = this.UnaryOperation()

      if (!right) {
        throw SyntaxError.unexpected(this.lexer.lookahead?.type, 'Expression')
      }

      left = {
        type: 'PowerOperation',
        left,
        right
      }
    }

    return left
  }

  MultiplyOperation() {
    let left: any = this.PowerOperation()

    while (this.lexer.lookaheadIs(Tokens.Multiply) || this.lexer.lookaheadIs(Tokens.Divide)) {
      const [operatorToken] = this.lexer.consume()

      const right = this.PowerOperation()

      if (!right) {
        throw SyntaxError.unexpected(this.lexer.lookahead?.type, 'Expression')
      }

      left = {
        type: ({
          [Tokens.Multiply.name]: 'MultiplyOperation',
          [Tokens.Divide.name]: 'DivideOperation',
        }[operatorToken.type.name]),
        left,
        right
      }
    }

    return left
  }

  AddOperation() {
    let left: any = this.MultiplyOperation()

    while (this.lexer.lookaheadIs(Tokens.Plus) || this.lexer.lookaheadIs(Tokens.Minus)) {
      const [operatorToken] = this.lexer.consume()

      const right = this.MultiplyOperation()

      if (!right) {
        throw SyntaxError.unexpected(this.lexer.lookahead?.type, 'Expression')
      }

      left = {
        type: ({
          [Tokens.Plus.name]: 'AddOperation',
          [Tokens.Minus.name]: 'SubtractOperation',
        }[operatorToken.type.name]),
        left,
        right
      }
    }

    return left
  }

  BitwiseOperation() {
    let left: any = this.AddOperation()

    while (
      this.lexer.lookaheadIs(Tokens.Ampersand)
      || this.lexer.lookaheadIs(Tokens.Pipe)
      || this.lexer.lookaheadIs(Tokens.BitwiseXor)
    ) {
      const [operatorToken] = this.lexer.consume()

      const right = this.AddOperation()

      if (!right) {
        throw SyntaxError.unexpected(this.lexer.lookahead?.type, 'Expression')
      }

      left = {
        type: ({
          [Tokens.Ampersand.name]: 'BitwiseAndOperation',
          [Tokens.Pipe.name]: 'BitwiseOrOperation',
          [Tokens.BitwiseXor.name]: 'BitwiseXorOperation',
        }[operatorToken.type.name]),
        left,
        right
      }
    }

    return left
  }

  BitwiseShiftOperation() {
    let left: any = this.BitwiseOperation()

    while (
      this.lexer.lookaheadIs(Tokens.BitwiseLeftShift)
      || this.lexer.lookaheadIs(Tokens.BitwiseRightShift)
    ) {
      const [operatorToken] = this.lexer.consume()

      const right = this.BitwiseOperation()

      if (!right) {
        throw SyntaxError.unexpected(this.lexer.lookahead?.type, 'Expression')
      }

      left = {
        type: ({
          [Tokens.BitwiseLeftShift.name]: 'BitwiseLeftShiftOperation',
          [Tokens.BitwiseRightShift.name]: 'BitwiseRightShiftOperation',
        }[operatorToken.type.name]),
        left,
        right
      }
    }

    return left
  }

  LogicalOperation() {
    let left: any = this.RelationalOperation()

    while (this.lexer.lookaheadIs(Tokens.And) || this.lexer.lookaheadIs(Tokens.Or)) {
      const [operatorToken] = this.lexer.consume()

      const right = this.RelationalOperation()

      if (!right) {
        throw SyntaxError.unexpected(this.lexer.lookahead?.type, 'Expression')
      }

      left = {
        type: ({
          [Tokens.And.name]: 'AndOperation',
          [Tokens.Or.name]: 'OrOperation',
        }[operatorToken.type.name]),
        left,
        right
      }
    }

    return left
  }

  RelationalOperation() {
    let left: any = this.AddOperation()

    while (
      this.lexer.lookaheadIs(Tokens.LessThan)
      || this.lexer.lookaheadIs(Tokens.LessThanOrEqual)
      || this.lexer.lookaheadIs(Tokens.GreaterThan)
      || this.lexer.lookaheadIs(Tokens.GreaterThanOrEqual)
    ) {
      const [operatorToken] = this.lexer.consume()

      const right = this.AddOperation()

      if (!right) {
        throw SyntaxError.unexpected(this.lexer.lookahead?.type, 'Expression')
      }

      left = {
        type: ({
          [Tokens.LessThan.name]: 'LessThanOperation',
          [Tokens.LessThanOrEqual.name]: 'LessThanOrEqualOperation',
          [Tokens.GreaterThan.name]: 'GreaterThanOperation',
          [Tokens.GreaterThanOrEqual.name]: 'GreaterThanOrEqualOperation',
        }[operatorToken.type.name]),
        left,
        right
      }
    }

    return left
  }

  UnaryOperation() {
    if (!(
      this.lexer.lookaheadIs(Tokens.Not) ||
      this.lexer.lookaheadIs(Tokens.BitwiseNot) ||
      this.lexer.lookaheadIs(Tokens.Minus) ||
      this.lexer.lookaheadIs(Tokens.Plus) ||
      this.lexer.lookaheadIs(Tokens.Increment) ||
      this.lexer.lookaheadIs(Tokens.Decrement)
    )) {
      return this.Term()
    }

    const [operatorToken] = this.lexer.consume()

    const expression = this.Expression()

    if (!expression) {
      throw SyntaxError.unexpected(this.lexer.lookahead?.type, 'Expression')
    }

    return {
      type: ({
        [Tokens.Not.name]: 'NotOperation',
        [Tokens.BitwiseNot.name]: 'BitwiseNotOperation',
        [Tokens.Minus.name]: 'NegativeOperation',
        [Tokens.Plus.name]: 'PositiveOperation',
        [Tokens.Increment.name]: 'IncrementOperation',
        [Tokens.Decrement.name]: 'DecrementOperation',
      }[operatorToken.type.name]),
      expression
    }
  }

  IncrementOperation() {
    if (!this.lexer.lookaheadIs(Tokens.Identifier)) {
      return
    }

    const [token] = this.lexer.consume()

    if (!(this.lexer.lookaheadIs(Tokens.Increment) || this.lexer.lookaheadIs(Tokens.Decrement))) {
      this.lexer.queue.unshift(token)
      return
    }

    const [operatorToken] = this.lexer.consume()

    return {
      type: ({
        [Tokens.Increment.name]: 'IncrementOperation',
        [Tokens.Decrement.name]: 'DecrementOperation',
      }[operatorToken.type.name]),
      identifier: token
    }
  }

  ParenthesisExpression() {
    if (!this.lexer.lookaheadIs(Tokens.LeftParenthesis)) {
      return
    }

    this.lexer.consume()

    const expression = this.Expression()

    if (!expression) {
      throw SyntaxError.unexpected(this.lexer.lookahead?.type, 'Expression')
    }

    this.lexer.match(Tokens.RightParenthesis)

    return expression
  }

  Identifier() {
    if (!this.lexer.lookaheadIs(Tokens.Identifier)) {
      return
    }

    const [{ token }] = this.lexer.consume()

    return {
      type: 'Identifier',
      name: token
    }
  }

  MemberExpression() {
    let identifier: any = this.Identifier()

    if (!identifier) {
      return
    }

    while (this.lexer.lookaheadIs(Tokens.Dot) || this.lexer.lookaheadIs(Tokens.LeftBracket)) {
      const [accessor] = this.lexer.consume()

      if (accessor.type === Tokens.LeftBracket) {
        const expression = this.Expression()

        if (!expression) {
          throw SyntaxError.unexpected(this.lexer.lookahead?.type, 'Expression')
        }

        this.lexer.match(Tokens.RightBracket)

        identifier = {
          type: 'MemberExpression',
          object: identifier,
          property: expression
        }

        continue
      }

      const property = this.Identifier()

      if (!property) {
        throw SyntaxError.unexpected(this.lexer.lookahead?.type, 'Identifier')
      }

      identifier = {
        type: 'MemberExpression',
        object: identifier,
        property
      }
    }

    return identifier
  }

  CallExpression() {
    const callee = this.MemberExpression()

    if (!callee) {
      return
    }

    if (!this.lexer.lookaheadIs(Tokens.LeftParenthesis)) {
      return callee
    }

    this.lexer.consume()

    const args: any[] = []

    const getNamedArg = () => {
      if (!this.lexer.lookaheadIs(Tokens.Identifier)) {
        return
      }

      const [identifier] = this.lexer.consume()

      if (!this.lexer.lookaheadIs(Tokens.Colon)) {
        this.lexer.queue.unshift(identifier)
        return
      }

      this.lexer.consume()

      const expression = this.Expression()

      if (!expression) {
        throw SyntaxError.unexpected(this.lexer.lookahead?.type, 'Expression')
      }

      return {
        type: 'NamedArgument',
        name: identifier.token,
        value: expression
      }
    }

    while (!this.lexer.lookaheadIs(Tokens.RightParenthesis)) {
      const expression = getNamedArg() ?? this.Expression()

      if (!expression) {
        throw SyntaxError.unexpected(this.lexer.lookahead?.type, 'Expression ou NamedArgument')
      }

      args.push(expression)

      if (this.lexer.lookaheadIs(Tokens.Comma)) {
        this.lexer.consume()
      }
    }

    this.lexer.match(Tokens.RightParenthesis)

    return {
      type: 'CallExpression',
      callee,
      args
    }
  }

  Expression() {
    return this.LogicalOperation()
  }

  Keyword(name: string) {
    if (!this.lexer.lookaheadIs(Tokens.Keyword) || this.lexer.lookahead?.token !== name) {
      return
    }

    const [token] = this.lexer.consume()

    return {
      type: 'Keyword',
      name: token.token
    }
  }

  VariableDeclaration({
    withKeyword = true,
    withType = true,
    withInitializer = true
  } = {}) {
    const variableDeclaration: any = {
      type: 'VariableDeclaration',
    }

    let isConst = false

    if (withKeyword) {
      const keyword = this.Keyword('let') ?? this.Keyword('const')

      if (!keyword) {
        return
      }

      isConst = keyword?.name === 'const'

      variableDeclaration.keyword = keyword.name

      if (!keyword) {
        return
      }
    }

    const identifier = this.Identifier()

    if (withKeyword && !identifier) {
      throw SyntaxError.unexpected(this.lexer.lookahead?.type, 'Identifier')
    }

    variableDeclaration.name = identifier?.name

    if (withType) {
      if (this.lexer.lookaheadIs(Tokens.Colon)) {
        this.lexer.consume()
  
        variableDeclaration.typeRef = this.TypeRef()
      }
    }

    if (withInitializer) {
      
      if (isConst || this.lexer.lookaheadIs(Tokens.Assign)) {
        this.lexer.match(Tokens.Assign)

        variableDeclaration.initializer = this.Expression()

        if (!variableDeclaration.initializer) {
          throw SyntaxError.unexpected(this.lexer.lookahead?.type, 'Expression')
        }
      }
    }

    return variableDeclaration
  }

  IfStatement() {
    const keyword = this.Keyword('if')

    if (!keyword) {
      return
    }

    const condition = this.Expression()

    if (!condition) {
      throw SyntaxError.unexpected(this.lexer.lookahead?.type, 'Expression')
    }

    const body = this.BlockStatement()

    if (!body) {
      throw SyntaxError.unexpected(this.lexer.lookahead?.type, 'BlockStatement')
    }

    if (this.Keyword('else')) {
      if (this.lexer.lookaheadIs(Tokens.Keyword) && this.lexer.lookahead?.token === 'if') {
        return {
          type: 'IfStatement',
          condition,
          body,
          elseStatement: this.IfStatement()
        }
      }

      const elseStatement = this.BlockStatement()

      if (!elseStatement) {
        throw SyntaxError.unexpected(this.lexer.lookahead?.type, 'BlockStatement')
      }

      return {
        type: 'IfStatement',
        condition,
        body,
        elseStatement
      }
    }

    return {
      type: 'IfStatement',
      condition,
      body
    }
  }

  LoopStatement() {
    const label = this.LabelStatement()
    const loopKeyword = this.Keyword('loop')

    if (!loopKeyword) {
      return
    }

    const body = this.BlockStatement()

    if (!body) {
      throw SyntaxError.unexpected(this.lexer.lookahead?.type, 'BlockStatement')
    }

    return {
      type: 'LoopStatement',
      label: label?.name,
      body,
    }
  }

  DoWhileStatement() {
    const label = this.LabelStatement()

    const doKeyword = this.Keyword('do')

    if (!doKeyword) {
      return
    }

    const body = this.BlockStatement()

    if (!body) {
      throw SyntaxError.unexpected(this.lexer.lookahead?.type, 'BlockStatement')
    }

    const whileKeyword = this.Keyword('while')

    if (!whileKeyword) {
      throw SyntaxError.unexpected(this.lexer.lookahead?.type, 'while')
    }

    const condition = this.Expression()

    if (!condition) {
      throw SyntaxError.unexpected(this.lexer.lookahead?.type, 'Expression')
    }

    return {
      type: 'DoWhileStatement',
      condition,
      body,
      label: label?.name,
    }
  }

  WhileStatement() {
    const label = this.LabelStatement()
    const whileKeyword = this.Keyword('while')

    if (!whileKeyword) {
      return
    }

    const condition = this.Expression()

    if (!condition) {
      throw SyntaxError.unexpected(this.lexer.lookahead?.type, 'Expression')
    }

    const body = this.BlockStatement()

    if (!body) {
      throw SyntaxError.unexpected(this.lexer.lookahead?.type, 'BlockStatement')
    }

    return {
      type: 'WhileStatement',
      condition,
      body: body.statements,
      label: label?.name,
    }
  }

  ForStatement() {
    const label = this.LabelStatement()
    const forKeyword = this.Keyword('for')

    if (!forKeyword) {
      return
    }

    this.lexer.match(Tokens.LeftParenthesis)

    const initializer = this.VariableDeclaration()

    this.lexer.match(Tokens.Semicolon)

    const condition = this.Expression()

    this.lexer.match(Tokens.Semicolon)

    const increment = this.Expression()

    this.lexer.match(Tokens.RightParenthesis)

    const body = this.BlockStatement()

    if (!body) {
      throw SyntaxError.unexpected(this.lexer.lookahead?.type, 'BlockStatement')
    }

    return {
      type: 'ForStatement',
      initializer,
      condition,
      increment,
      body: body.statements,
      label: label?.name,
    }
  }

  ForOfStatement() {
    const forKeyword = this.Keyword('for')

    if (!forKeyword) {
      return
    }

    const iterator = this.Identifier()

    if (!iterator) {
      throw SyntaxError.unexpected(this.lexer.lookahead?.type, 'Identifier')
    }

    const ofKeyword = this.Keyword('of')

    if (!ofKeyword) {
      throw SyntaxError.unexpected(this.lexer.lookahead?.type, 'of')
    }

    const iterable = this.Expression()

    if (!iterable) {
      throw SyntaxError.unexpected(this.lexer.lookahead?.type, 'Expression')
    }

    const body = this.BlockStatement()

    if (!body) {
      throw SyntaxError.unexpected(this.lexer.lookahead?.type, 'BlockStatement')
    }

    return {
      type: 'ForOfStatement',
      iterator,
      iterable,
      body: body.statements,
    }
  }

  FunctionDeclaration({
    withKeyword = true,
    withName = true,
    withBody = true
  } = {}) {
    if (withKeyword) {
      const keyword = this.Keyword('func')

      if (!keyword) {
        return
      }
    }

    const functionDeclaration: any = {
      type: 'FunctionDeclaration',
    }

    if (withName) {
      const identifier = this.Identifier()

      if (!identifier) {
        throw SyntaxError.unexpected(this.lexer.lookahead?.type, 'Identifier')
      }

      functionDeclaration.name = identifier.name
    }

    this.lexer.match(Tokens.LeftParenthesis)

    functionDeclaration.params ??= []

    const VariadicParam = () => {
      if (!this.lexer.lookaheadIs(Tokens.Ellipsis)) {
        return
      }

      this.lexer.consume()

      const identifier = this.Identifier()

      if (!identifier) {
        throw SyntaxError.unexpected(this.lexer.lookahead?.type, 'Identifier')
      }

      return {
        type: 'VariadicParameter',
        name: identifier.name,
      }
    }

    while (!this.lexer.lookaheadIs(Tokens.RightParenthesis)) {
      const identifier = VariadicParam() ?? this.Identifier()

      if (!identifier) {
        throw SyntaxError.unexpected(this.lexer.lookahead?.type, 'Identifier')
      }

      let typeRef: any
      let defaultExpression: any

      if (this.lexer.lookaheadIs(Tokens.Colon)) {
        this.lexer.consume()
        typeRef = this.TypeRef()
      }

      if (this.lexer.lookaheadIs(Tokens.Assign)) {
        this.lexer.consume()
        defaultExpression = this.Expression()
      }

      const param = {
        type: 'FunctionParameter',
        name: identifier.name,
        typeRef,
        defaultExpression,
        variadic: identifier.type === 'VariadicParameter'
      }

      functionDeclaration.params.push(param)

      if (param.variadic) {
        break
      }

      if (this.lexer.lookaheadIs(Tokens.Comma)) {
        this.lexer.consume()
        continue
      }

      break
    }

    this.lexer.match(Tokens.RightParenthesis)

    if (this.lexer.lookaheadIs(Tokens.Colon)) {
      this.lexer.consume()
      functionDeclaration.returnType = this.TypeRef()
    }

    if (withBody) {
      const body = this.BlockStatement()

      if (!body) {
        throw SyntaxError.unexpected(this.lexer.lookahead?.type, 'FunctionBody')
      }

      functionDeclaration.body = body
    }

    return functionDeclaration
  }

  Statements() {
    const statements: any[] = []

    while (true) {
      const statement = this.Statement()      

      if (statement) {
        statements.push(statement)
        continue
      }

      break
    }    

    return statements
  }

  Literal() {
    return this.NumberLiteral()
      ?? this.StringLiteral()
      ?? this.BooleanLiteral()
      ?? this.NullLiteral()
      ?? this.VoidLiteral()
      ?? this.InfinityLiteral()
      ?? this.ArrayLiteral()
      ?? this.MapLiteral()
  }

  Term() {
    return this.ParenthesisExpression()
      ?? this.IncrementOperation()
      ?? this.Literal()
      ?? this.CallExpression()
      ?? this.MemberExpression()
  }

  ReturnStatement() {
    const keyword = this.Keyword('return')

    if (!keyword) {
      return
    }

    const expression = this.Expression()

    if (!expression) {
      throw SyntaxError.unexpected(this.lexer.lookahead?.type, 'Expression')
    }

    return {
      type: 'ReturnStatement',
      expression
    }
  }

  TypeRef() {
    const TypeTerm = () => {
      if (this.lexer.lookaheadIs(Tokens.LeftParenthesis)) {
        this.lexer.consume()
        const typeRef = this.TypeRef()
        this.lexer.match(Tokens.RightParenthesis)

        typeRef.optional ||= this.lexer.match(Tokens.QuestionMark, false) !== null

        return typeRef
      }

      const typeObject = this.TypeObjectDeclaration()

      if (typeObject) {
        return typeObject
      }

      const identifier = this.Identifier()

      if (!identifier) {
        return
      }

      let typeRef: any = {
        type: 'TypeRef',
        name: identifier.name,
        typeArgs: [],
        optional: false
      }

      if (this.lexer.lookaheadIs(Tokens.LessThan)) {
        this.lexer.consume()

        while (!this.lexer.lookaheadIs(Tokens.GreaterThan)) {
          const typeArg = this.TypeRef()

          if (!typeArg) {
            throw SyntaxError.unexpected(this.lexer.lookahead?.type, 'TypeRef')
          }

          typeRef.typeArgs.push(typeArg)

          if (this.lexer.lookaheadIs(Tokens.Comma)) {
            this.lexer.consume()
            continue
          }
        }

        this.lexer.match(Tokens.GreaterThan)
      }

      typeRef.optional = this.lexer.match(Tokens.QuestionMark, false) !== null

      if (this.lexer.lookaheadIs(Tokens.LeftBracket)) {
        this.lexer.consume()
        this.lexer.match(Tokens.RightBracket)

        typeRef = {
          type: 'TypeRef',
          name: 'Array',
          typeArgs: [typeRef],
          optional: this.lexer.match(Tokens.QuestionMark, false) !== null
        }
      }

      return typeRef
    }

    let typeRef: any = TypeTerm()

    // Type Union
    if (this.lexer.lookaheadIs(Tokens.Pipe)) {
      this.lexer.consume()

      typeRef = {
        type: 'TypeUnion',
        left: typeRef,
        right: this.TypeRef()
      }
    }

    // Type Intersection
    if (this.lexer.lookaheadIs(Tokens.Ampersand)) {
      this.lexer.consume()

      typeRef = {
        type: 'TypeIntersection',
        left: typeRef,
        right: this.TypeRef(),
      }
    }

    return typeRef
  }

  OperatorDeclaration ({
    withBody = true
  } = {}) {
    const operatorKeyword = this.Keyword('operator')

    if (!operatorKeyword) {
      return
    }

    const operatorOverload = {
      type: 'OperatorOverload',
      operator: null as any,
      params: [] as any[],
      returnType: null as any,
      body: null as any,
    }

    const operator: any = this.Keyword('new')
      ?? this.Keyword('call')
      ?? this.lexer.match(Tokens.And, false)
      ?? this.lexer.match(Tokens.Or, false)
      ?? this.lexer.match(Tokens.Plus, false)
      ?? this.lexer.match(Tokens.Minus, false)
      ?? this.lexer.match(Tokens.Multiply, false)
      ?? this.lexer.match(Tokens.Divide, false)
      ?? this.lexer.match(Tokens.Ampersand, false)
      ?? this.lexer.match(Tokens.Pipe, false)
      ?? this.lexer.match(Tokens.BitwiseXor, false)
      ?? this.lexer.match(Tokens.BitwiseLeftShift, false)
      ?? this.lexer.match(Tokens.BitwiseRightShift, false)
      ?? this.lexer.match(Tokens.LessThan, false)
      ?? this.lexer.match(Tokens.LessThanOrEqual, false)
      ?? this.lexer.match(Tokens.GreaterThan, false)
      ?? this.lexer.match(Tokens.GreaterThanOrEqual, false)
      ?? this.lexer.match(Tokens.Equal, false)
      ?? this.lexer.match(Tokens.NotEqual, false)
      ?? this.lexer.match(Tokens.Not, false)
      ?? this.lexer.match(Tokens.BitwiseNot, false)
      ?? this.lexer.match(Tokens.Increment, false)
      ?? this.lexer.match(Tokens.Decrement, false)

    if (!operator) {
      throw SyntaxError.unexpected(this.lexer.lookahead?.type, 'Operator')
    }

    if (operator.type === 'Keyword') {
      operatorOverload.operator = operator.name
    } else {
      operatorOverload.operator = operator.token
    }

    const fnDeclaration = this.FunctionDeclaration({
      withKeyword: false,
      withName: false,
      withBody: withBody
    })

    if (!fnDeclaration) {
      throw SyntaxError.unexpected(this.lexer.lookahead?.type, 'FunctionDeclaration')
    }

    operatorOverload.params = fnDeclaration.params
    operatorOverload.returnType = fnDeclaration.returnType
    operatorOverload.body = fnDeclaration.body

    return operatorOverload
  }

  ClassDeclaration() {
    const keyword = this.Keyword('class')

    if (!keyword) {
      return
    }

    const identifier = this.Identifier()

    if (!identifier) {
      throw SyntaxError.unexpected(this.lexer.lookahead?.type, 'Identifier')
    }

    const classDeclaration = {
      type: 'ClassDeclaration',
      identifier: identifier.name,
      extendsClause: null as any,
      implementsClause: [] as any[],
      withClauses: [] as any[],
      properties: [] as any[],
      methods: [] as any[],
      operators: [] as any[],
    }

    if (this.Keyword('extends')) {
      classDeclaration.extendsClause = this.Identifier()
    }

    if (this.Keyword('implements')) {
      while (true) {
        classDeclaration.implementsClause.push(this.TypeRef())

        if (this.lexer.lookaheadIs(Tokens.Comma)) {
          this.lexer.consume()
          continue
        }

        break
      }
    }

    if (this.Keyword('with')) {
      while (true) {
        classDeclaration.withClauses.push(this.Identifier())

        if (this.lexer.lookaheadIs(Tokens.Comma)) {
          this.lexer.consume()
          continue
        }

        break
      }
    }

    this.lexer.match(Tokens.LeftBrace)

    const AccessModifier = () => {
      if (this.Keyword('public')) {
        return 'public'
      }

      if (this.Keyword('protected')) {
        return 'protected'
      }

      if (this.Keyword('private')) {
        return 'private'
      }

      return 'public'
    }

    const StaticModifier = () => {
      if (this.Keyword('static')) {
        return true
      }

      return false
    }

    const PropertyDeclaration = () => {
      return this.VariableDeclaration()
    }

    const MethodDeclaration = () => this.FunctionDeclaration()

    while (!this.lexer.lookaheadIs(Tokens.RightBrace)) {
      const access = AccessModifier()
      const isStatic = StaticModifier()
      const member = this.OperatorDeclaration() ?? MethodDeclaration() ?? PropertyDeclaration()

      if (!member) {
        throw SyntaxError.unexpected(this.lexer.lookahead?.type, 'PropertyDeclaration, MethodDeclaration ou OperatorOperator')
      }

      if (member.type === 'OperatorOverload') {
        classDeclaration.operators.push({
          ...member,
          type: 'ClassOperator',
          access,
          isStatic,
        })
      } else if (member.type === 'VariableDeclaration') {
        classDeclaration.properties.push({
          ...member,
          type: 'ClassProperty',
          access,
          isStatic,
        })
      } else {
        classDeclaration.methods.push({
          ...member,
          type: 'ClassMethod',
          access,
          isStatic,
        })
      }
    }

    this.lexer.match(Tokens.RightBrace)

    return classDeclaration
  }

  BlockStatement() {
    if (!this.lexer.lookaheadIs(Tokens.LeftBrace)) {
      return
    }

    this.lexer.consume()

    const statements = this.Statements()

    this.lexer.match(Tokens.RightBrace)

    return {
      type: 'BlockStatement',
      statements
    }
  }

  InterfaceDeclaration() {
    if (!this.Keyword('interface')) {
      return
    }

    const identifier = this.Identifier()

    if (!identifier) {
      throw SyntaxError.unexpected(this.lexer.lookahead?.type, 'Identifier')
    }

    const interfaceDeclaration = {
      type: 'InterfaceDeclaration',
      identifier: identifier.name,
      extendsClause: [] as any[],
      properties: [] as any[],
      methods: [] as any[],
    }

    if (this.Keyword('extends')) {
      while (true) {
        interfaceDeclaration.extendsClause.push(this.TypeRef())

        if (this.lexer.lookaheadIs(Tokens.Comma)) {
          this.lexer.consume()
          continue
        }

        break
      }
    }

    this.lexer.match(Tokens.LeftBrace)

    const PropertyDeclaration = () => {
      const variableDeclaration = this.VariableDeclaration({
        withInitializer: false,
        withKeyword: false
      })

      if (!variableDeclaration?.name) {
        return
      }      

      return {
        type: 'PropertyDeclaration',
        name: variableDeclaration.name,
        typeRef: variableDeclaration.typeRef,
      }
    }

    const MethodDeclaration = () => {
      const functionDeclaration = this.FunctionDeclaration({
        withBody: false,
      })

      if (!functionDeclaration) {
        return
      }

      return {
        type: 'MethodDeclaration',
        identifier: functionDeclaration.name,
        params: functionDeclaration.params,
        returnType: functionDeclaration.returnType,
      }
    }

    while (!this.lexer.lookaheadIs(Tokens.RightBrace)) {
      const member = this.OperatorDeclaration({ withBody: false }) ?? MethodDeclaration() ?? PropertyDeclaration()

      if (!member) {
        throw SyntaxError.unexpected(this.lexer.lookahead?.type, 'PropertyDeclaration ou MethodDeclaration')
      }

      if (member.type === 'PropertyDeclaration') {
        interfaceDeclaration.properties.push(member)
      } else if (member.type === 'MethodDeclaration') {
        interfaceDeclaration.methods.push(member)
      }
    }

    this.lexer.match(Tokens.RightBrace)

    return interfaceDeclaration
  }

  TypeObjectDeclaration() {
    if (!this.lexer.lookaheadIs(Tokens.LeftBrace)) {
      return;
    }

    this.lexer.consume()

    const typeObjectDeclaration = {
      type: 'TypeObjectDeclaration',
      entries: [] as any[]
    }

    while(!this.lexer.lookaheadIs(Tokens.RightBrace)) {
      const key = this.Identifier()

      if (!key) {
        throw SyntaxError.unexpected(this.lexer.lookahead?.type, 'Identifier')
      }

      this.lexer.match(Tokens.Colon)

      const typeRef = this.TypeRef()

      if (!typeRef) {
        throw SyntaxError.unexpected(this.lexer.lookahead?.type, 'TypeRef')
      }

      typeObjectDeclaration.entries.push({
        type: 'TypeObjectEntry',
        key: key.name,
        typeRef
      })

      if (this.lexer.lookaheadIs(Tokens.Comma)) {
        this.lexer.consume()
        continue
      }

      break
    }

    this.lexer.match(Tokens.RightBrace)

    return typeObjectDeclaration
  }

  TypeDeclaration() {
    if (!this.Keyword('type')) {
      return
    }

    const identifier = this.Identifier()

    if (!identifier) {
      throw SyntaxError.unexpected(this.lexer.lookahead?.type, 'Identifier')
    }

    this.lexer.match(Tokens.Assign)

    const typeRef = this.TypeRef()

    if (!typeRef) {
      throw SyntaxError.unexpected(this.lexer.lookahead?.type, 'TypeRef')
    }

    return {
      type: 'TypeDeclaration',
      identifier: identifier.name,
      typeRef
    }
  }

  BreakStatement() {
    const keyword = this.Keyword('break')

    if (keyword) {
      return {
        type: 'ContinueStatement',
        label: this.Identifier()?.name
      }
    }
  }

  LabelStatement() {
    const identifier = this.lexer.match(Tokens.Identifier, false)

    if (!identifier) {
      return
    }

    const colon = this.lexer.match(Tokens.Colon, false)

    if (!colon) {
      this.lexer.queue.unshift(identifier)
      return
    }

    return {
      type: 'LabelStatement',
      name: identifier.token
    }
  }

  ContinueStatement() {
    const keyword = this.Keyword('continue')

    if (keyword) {
      return {
        type: 'ContinueStatement',
        label: this.Identifier()?.name
      }
    }
  }

  ImportStatement() {
    const importKeyword = this.Keyword('import')

    if (!importKeyword) {
      return
    }

    const importStatement = {
      type: 'ImportStatement',
      local: null as any,
      source: null as any,
      specifiers: [] as any[],
    }

    if (this.lexer.lookaheadIs(Tokens.LeftBrace)) {
      this.lexer.consume()

      while (!this.lexer.lookaheadIs(Tokens.RightBrace)) {
        const identifier = this.Identifier()

        if (!identifier) {
          break
        }

        let alias: any

        if (this.Keyword('as')) {
          const aliasIdentifier = this.Identifier()

          if (!aliasIdentifier) {
            throw SyntaxError.unexpected(this.lexer.lookahead?.type, 'Identifier')
          }

          alias = aliasIdentifier.name
        }

        importStatement.specifiers.push({
          type: 'ImportSpecifier',
          identifier: identifier.name,
          alias,
        })

        if (this.lexer.lookaheadIs(Tokens.Comma)) {
          this.lexer.consume()
          continue
        }

        break
      }

      this.lexer.match(Tokens.RightBrace)
    } else {
      const identifier = this.Identifier()

      if (!identifier) {
        throw SyntaxError.unexpected(this.lexer.lookahead?.type, 'Identifier')
      }

      importStatement.local = identifier.name
    }

    if (importStatement.local || importStatement.specifiers.length > 0) {
      this.Keyword('from')

      const sourceToken = this.StringLiteral()

      if (!sourceToken) {
        throw SyntaxError.unexpected(this.lexer.lookahead?.type, 'StringLiteral')
      }

      importStatement.source = sourceToken.value
    }

    return importStatement
  }

  Statement() {
    return (
      this.ImportStatement()
      ?? this.VariableDeclaration()
      ?? this.ClassDeclaration()
      ?? this.InterfaceDeclaration()
      ?? this.TypeDeclaration()
      ?? this.IfStatement()
      ?? this.FunctionDeclaration()
      ?? this.LoopStatement()
      ?? this.DoWhileStatement()
      ?? this.WhileStatement()
      ?? this.ForOfStatement()
      ?? this.ForStatement()
      ?? this.BlockStatement()
      ?? this.BreakStatement()
      ?? this.ContinueStatement()
      ?? this.ReturnStatement()
      ?? this.Expression()
    )
  }

  Program() {
    return {
      type: 'Program',
      statements: this.Statements()
    }
  }
}
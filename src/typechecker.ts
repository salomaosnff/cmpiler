import { Type, TypeAlias, TypeClass, TypeFunction, TypeRef, isTypeAssignableTo, isTypeFunction, isTypeIntersection, isTypeRef, isTypeUnion, typeToString } from "./typeutils"

interface Variable {
    name: string
    type: Type
}

const builtinTypes = {
    string: {
        type: 'TypeRef',
        name: 'string',
        typeArgs: [] as any[],
        optional: false
    },
    number: {
        type: 'TypeRef',
        name: 'number',
        typeArgs: [] as any[],
        optional: false
    },
    boolean: {
        type: 'TypeRef',
        name: 'boolean',
        typeArgs: [] as any[],
        optional: false
    },
    Array: {
        type: 'TypeRef',
        name: 'Array',
        typeArgs: [] as any[],
        optional: false
    }
} as const

class Scope {
    constructor(public parent?: Scope) { }

    private readonly variables = new Map<string, Variable>()
    private readonly types = new Map<string, Type>()

    fork(): Scope {
        return new Scope(this)
    }

    declare(variable: Variable) {
        this.variables.set(variable.name, variable)
    }

    declareType(type: Type) {
        if (isTypeUnion(type) || isTypeIntersection(type) || isTypeRef(type)) {
            return
        }        

        this.types.set(type.name, type)
    }

    lookup(name: string): Variable | undefined {
        return this.variables.get(name) ?? this.parent?.lookup(name)
    }

    lookupType(typeRef: Type): Type {
        if (isTypeUnion(typeRef)) {
            return {
                type: 'TypeUnion',
                left: this.lookupType(typeRef.left),
                right: this.lookupType(typeRef.right),
                optional: typeRef.optional
            }
        }

        if (isTypeIntersection(typeRef)) {
            return {
                type: 'TypeIntersection',
                left: this.lookupType(typeRef.left),
                right: this.lookupType(typeRef.right),
                optional: typeRef.optional
            }
        }

        if (isTypeRef(typeRef)) {
            const name = (typeRef as any).name
            const type = this.types.get(name) ?? this.parent?.lookupType(typeRef) ?? builtinTypes[name]
            
            if (!type) {
                throw new Error(`O tipo ${typeToString(typeRef)} não foi declarado`)
            }

            return type
        }

        return typeRef
    }
}

function getLiteralExpressionType(expression: any, scope: Scope): Type | undefined {
    if (expression.type === 'StringLiteral') {
        return builtinTypes.string
    }

    if (expression.type === 'NumberLiteral') {
        return builtinTypes.number
    }

    if (expression.type === 'BooleanLiteral') {
        return builtinTypes.boolean
    }

    if (expression.type === 'ArrayLiteral') {
        const elementsTypes = [...new Set(expression.elements.map((element) => getExpressionType(element, scope)))]

        return {
            type: 'TypeRef',
            name: 'Array',
            optional: false,
            typeArgs: elementsTypes.length > 1 ? [elementsTypes.reduce((lastType: any, currentType, index) => {
                if (index === 0) {
                    return {
                        type: 'TypeUnion',
                        left: currentType,
                        right: lastType,
                        optional: false
                    }
                }

                if (index === 1) {
                    lastType.right = currentType
                    return lastType
                }

                return {
                    type: 'TypeUnion',
                    left: currentType,
                    right: lastType,
                    optional: false
                }
            }, {})] as any[] : elementsTypes as any[]
        }
    }
}

function getIdentiferType(identifier: any, scope: Scope): Type | undefined {
    const variable = scope.lookup(identifier.name)

    if (!variable) {
        throw new Error(`A variável ${identifier.name} não foi declarada`)
    }

    return variable.type
}

function getExpressionType(expression: any, scope: Scope): any {
    if (!expression) {
        return null
    }

    if (expression.type === 'Identifier') {
        return getIdentiferType(expression, scope)
    }

    if (expression.type === 'ClassDeclaration') {
        return classToType(expression, scope)
    }

    return getLiteralExpressionType(expression, scope) ?? null
}

function classToType(expression: any, scope: Scope): TypeClass {
    return {
        type: 'TypeClass',
        name: expression.identifier,
        properties: expression.properties.map((property: any) => ({
            name: property.name,
            type: property.typeRef ?? getExpressionType(property.initializer, scope),
            optional: property.optional
        })),
        methods: expression.methods.map((method: any) => ({
            name: method.name,
            type: {
                type: 'TypeFunction',
                optional: false,
                parameters: method.params.map(param => ({
                    name: param.name,
                    type: param.typeRef,
                }))
            } as TypeFunction,
        })),
        optional: false
    }
}

export class Typechecker {
    check(ast: any, scope = new Scope()) {
        if (ast.type in this) {
            return this[ast.type](ast, scope)
        }
    }

    Program(program: any) {
        const scope = new Scope()

        for (const statement of program.statements) {
            this.check(statement, scope)
        }
    }

    BlockStatement(expression: any, scope: Scope) {
        const blockScope = scope.fork()

        for (const statement of expression.statements) {
            this.check(statement, blockScope)
        }
    }

    VariableDeclaration(declaration: any, scope: Scope) {
        let typeRef = declaration.typeRef

        if (declaration.initializer) {
            const expressionType = getExpressionType(declaration.initializer, scope)

            typeRef ??= expressionType

            if (!isTypeAssignableTo(expressionType, declaration.typeRef ?? expressionType)) {
                throw new Error(`O tipo ${typeToString(expressionType)} não é um sub-tipo de ${typeToString(declaration.typeRef)}`)
            }
        }

        scope.declare({
            name: declaration.name,
            type: scope.lookupType(typeRef)
        })
    }

    FunctionDeclaration(declaration: any, scope: Scope) {
        scope.declare({
            name: declaration.name,
            type: {
                type: 'TypeFunction',
                name: declaration.name,
                optional: false,
                parameters: declaration.params.map((parameter: any) => ({
                    name: parameter.name,
                    type: parameter.typeRef,
                    optional: false
                })),
                returnType: declaration.returnType
            }
        })

        const functionScope = scope.fork()

        this.check(declaration.body, functionScope)
    }

    Identifier(identifier: any, scope: Scope) {
        const variable = scope.lookup(identifier.name)

        if (!variable) {
            throw new Error(`A variável ${identifier.name} não foi declarada`)
        }

        return variable.type
    }

    CallExpression(expression: any, scope: Scope) {
        if (expression.callee.type === 'Identifier') {
            const callee = scope.lookup(expression.callee.name)

            if (!callee) {
                throw new Error(`A função ${expression.callee.name} não foi declarada`)
            }

            if (callee.type?.type !== 'TypeFunction') {
                throw new Error(`${expression.callee.name} não é uma função`)
            }

            if (callee.type.parameters.length !== expression.args.length) {
                throw new Error(`A função "${expression.callee.name}" espera ${callee.type.parameters.length} argumentos, mas ${expression.args.length} foram passados`)
            }

            for (let i = 0; i < expression.args.length; i++) {
                const arg = expression.args[i]
                const param = callee.type.parameters[i]
                const argumentType = getExpressionType(arg, scope)
                const paramType = scope.lookupType(param.type as any)

                if (!isTypeAssignableTo(argumentType, paramType)) {
                    throw new Error(`O tipo ${typeToString(argumentType)} não é um sub-tipo de ${typeToString(paramType)}`)
                }
            }

            return callee.type.returnType
        }

        if (expression.callee.type === 'MemberExpression') {
            const object: any = scope.lookupType(this.check(expression.callee.object, scope))
            const property = expression.callee.property.name
            const method = object.methods?.find(method => method.name === property)

            if (!method) {
                throw new Error(`O método "${property}" não foi declarado na classe ${object.name}`)
            }

            if (method.type.parameters.length !== expression.args.length) {
                throw new Error(`O método "${property}" espera ${method.type.parameters.length} argumentos, mas ${expression.args.length} foram passados`)
            }

            for (let i = 0; i < expression.args.length; i++) {
                const arg = expression.args[i]
                const param = method.type.parameters[i]
                const argumentType = getExpressionType(arg, scope)
                const paramType = param.type

                if (!isTypeAssignableTo(argumentType, paramType)) {
                    throw new Error(`O tipo ${typeToString(argumentType)} não é um sub-tipo de ${typeToString(paramType)}`)
                }
            }

            return method.type.returnType
        }

    }

    MemberExpression(expression: any, scope: Scope) {
        const object: any = scope.lookupType(this.check(expression.object, scope))
        const property = expression.property.name
        const propertyType = object.properties.find(property => property.name === expression.property.name)?.type

        if (!propertyType) {
            throw new Error(`A propriedade "${property}" não foi declarada na classe ${object.name}`)
        }

        return propertyType
    }

    ClassDeclaration(expression: any, scope: Scope) {
        const classType = classToType(expression, scope)

        scope.declareType(classType)
    }

    TypeDeclaration(expression: any, scope: Scope) {
        scope.declareType({
            type: 'TypeAlias',
            name: expression.identifier,
            typeRef: scope.lookupType(expression.typeRef) as any
        })
    }
}
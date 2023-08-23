export interface TypeBase {
    optional: boolean
}

export interface TypeRef {
    type: 'TypeRef'
    typeRef: TypeFunction | TypeClass | TypeAlias
    typeArgs: Type[]
    optional: boolean
}

export interface TypeUnion {
    type: 'TypeUnion'
    left: Type
    right: Type
    optional: boolean
}

export interface TypeIntersection {
    type: 'TypeIntersection'
    left: Type
    right: Type
    optional: boolean
}

export interface TypeFunction extends TypeBase {
    type: 'TypeFunction'
    name: string
    parameters: TypeFunctionParam[]
    returnType: Type
}

export interface TypeFunctionParam {
    name?: string
    type: Type
    optional: boolean
}

export interface TypeClass extends TypeBase {
    type: 'TypeClass'
    name: string
    properties: TypeClassProperty[]
    methods: TypeClassMethod[]
}

export interface TypeAlias {
    type: 'TypeAlias'
    name: string
    typeRef: TypeRef
}

export interface TypeClassProperty {
    name: string
    type: Type
    optional: boolean
}

export interface TypeClassMethod {
    name: string
    type: TypeFunction
}

export type Type = 
    | TypeRef
    | TypeFunction
    | TypeClass
    | TypeAlias
    | TypeUnion
    | TypeIntersection

export function isTypeRef(type: Type): type is TypeRef {
    return type?.type === 'TypeRef'
}

export function isTypeUnion(type: Type): type is TypeUnion {
    return type?.type === 'TypeUnion'
}

export function isTypeIntersection(type: any): type is TypeIntersection {
    return type?.type === 'TypeIntersection'
}

export function isTypeFunction(type: Type): type is TypeFunction {
    return type?.type === 'TypeFunction'
}

export function isTypeClass(type: Type): type is TypeClass {
    return type?.type === 'TypeClass'
}

export function isTypeAlias(type: Type): type is TypeAlias {
    return type?.type === 'TypeAlias'
}

export function unwrapType(type: Type): Type {
    if (isTypeAlias(type) || isTypeRef(type)) {
        return unwrapType(type.typeRef)
    }

    return type
}

export function isTypeAssignableTo(valueType: Type, inputType: Type): boolean {
    const normalizedValueType = unwrapType(valueType)
    const normalizedInputType = unwrapType(inputType)
    
    if (normalizedValueType === normalizedInputType) {
        return true
    }

    if (isTypeUnion(normalizedInputType)) {
        return isTypeAssignableTo(normalizedValueType, normalizedInputType.left) || isTypeAssignableTo(normalizedValueType, normalizedInputType.right)
    }

    if (isTypeIntersection(normalizedInputType)) {
        return isTypeAssignableTo(normalizedValueType, normalizedInputType.left) && isTypeAssignableTo(normalizedValueType, normalizedInputType.right)
    }

    if (isTypeRef(normalizedValueType) && isTypeRef(normalizedInputType)) {
        if (normalizedValueType.typeRef !== normalizedInputType.typeRef) {
            return false
        }

        if (normalizedValueType.typeArgs.length !== normalizedInputType.typeArgs.length) {
            return false
        }

        return normalizedValueType.typeArgs.every((typeArg, index) => isTypeAssignableTo(typeArg, normalizedInputType.typeArgs[index]))
    }

    if (isTypeFunction(normalizedValueType) && isTypeFunction(normalizedInputType)) {
        if (normalizedValueType.parameters.length !== normalizedInputType.parameters.length) {
            return false
        }

        return normalizedValueType.parameters.every((parameter, index) => isTypeAssignableTo(parameter.type, normalizedInputType.parameters[index].type))
    }

    return false
}

export function typeToString(type: Type): string {
    if (isTypeRef(type) || isTypeClass(type)) {
        let typeStr = 'name' in type ? type.name : 'unknown'

        if ('typeArgs' in type && type.typeArgs.length) {
            typeStr += `<${type.typeArgs.map(typeToString).join(', ')}>`
        }        

        return typeStr
    }

    if (isTypeUnion(type)) {
        return `${typeToString(type.left)} | ${typeToString(type.right)}`
    }

    if (isTypeIntersection(type)) {
        return `${typeToString(type.left)} & ${typeToString(type.right)}`
    }

    if (isTypeAlias(type)) {
        return type.name
    }

    return 'unknown'
}
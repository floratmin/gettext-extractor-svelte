import * as ts from 'typescript';

export type TextNode = {
    kind: ts.SyntaxKind.Identifier,
    text: string;
};

export type FunctionExtractor = {
    kind: ts.SyntaxKind;
    name?: TextNode;
    left?: TextNode;
    initializer?: FunctionExtractor;
    type?: FunctionExtractor;
    body?: FunctionExtractor;
    properties?: FunctionExtractor [];
    members?: FunctionExtractor[];
    getPos?: boolean;
    expression?: {
        kind: ts.SyntaxKind;
        left?: TextNode;
        right?: FunctionExtractor;
    };
};


export class FunctionExtractorBuilder {

    public objectLiteralExpression(properties?: FunctionExtractor[], getPos: boolean = false): FunctionExtractor {
        return {
            kind: ts.SyntaxKind.ObjectLiteralExpression,
            ...(properties ? {properties} : {}),
            ...(getPos ? {getPos} : {})
        };
    }

    public variableDeclaration(variableName: string, initializer?: FunctionExtractor, getPos: boolean = false): FunctionExtractor {
        return {
            kind: ts.SyntaxKind.VariableDeclaration,
            ...this.getName(variableName),
            ...(initializer ? {initializer} : {}),
            ...(getPos ? {getPos} : {})
        };
    }

    public propertyAssignment(keyName: string, initializer?: FunctionExtractor, getPos: boolean = false): FunctionExtractor {
        return {
            kind: ts.SyntaxKind.PropertyAssignment,
            ...this.getName(keyName),
            ...(initializer ? {initializer} : {}),
            ...(getPos ? {getPos} : {})
        };
    }

    public methodDeclaration(methodName: string, getPos: boolean = false): FunctionExtractor {
        return {
            kind: ts.SyntaxKind.MethodDeclaration,
            ...this.getName(methodName),
            ...(getPos ? {getPos} : {})
        };
    }

    public arrowFunction(getPos: boolean = false): FunctionExtractor {
        return {
            kind: ts.SyntaxKind.ArrowFunction,
            ...(getPos ? {getPos} : {})
        };
    }

    public functionExpression(functionName?: string, getPos: boolean = false): FunctionExtractor {
        return {
            kind: ts.SyntaxKind.FunctionExpression,
            ...(functionName ? this.getName(functionName) : {}),
            ...(getPos ? {getPos} : {})
        };
    }

    public propertyDeclaration(propertyName: string, initializer?: FunctionExtractor, getPos: boolean = false): FunctionExtractor {
        return {
            kind: ts.SyntaxKind.PropertyDeclaration,
            ...this.getName(propertyName),
            ...(initializer ? {initializer} : {}),
            ...(getPos ? {getPos} : {})
        };
    }

    public functionDeclaration(functionName: string, getPos: boolean = false): FunctionExtractor {
        return {
            kind: ts.SyntaxKind.FunctionDeclaration,
            ...this.getName(functionName),
            ...(getPos ? {getPos} : {})
        };
    }

    public classDeclaration(className: string, members?: FunctionExtractor[], getPos: boolean = false): FunctionExtractor {
        return {
            kind: ts.SyntaxKind.ClassDeclaration,
            ...this.getName(className),
            ...(members ? {members} : {}),
            ...(getPos ? {getPos} : {})
        };
    }

    public classExpression(className?: string, members?: FunctionExtractor[], getPos: boolean = false): FunctionExtractor {
        return {
            kind: ts.SyntaxKind.ClassExpression,
            ...(className ? this.getName(className) : {}),
            ...(members ? {members} : {}),
            ...(getPos ? {getPos} : {})
        };
    }

    public getAccessor(accessorName: string, body?: FunctionExtractor, getPos: boolean = false): FunctionExtractor {
        return {
            kind: ts.SyntaxKind.GetAccessor,
            ...this.getName(accessorName),
            ...(body ? {body} : {}),
            ...(getPos ? {getPos} : {})
        };
    }

    public setAccessor(accessorName: string, body?: FunctionExtractor, getPos: boolean = false): FunctionExtractor {
        return {
            kind: ts.SyntaxKind.SetAccessor,
            ...this.getName(accessorName),
            ...(body ? {body} : {}),
            ...(getPos ? {getPos} : {})
        };
    }

    public expressionStatement(identifier: string, right?: FunctionExtractor, getPos: boolean = false): FunctionExtractor {
        return {
            kind: ts.SyntaxKind.ExpressionStatement,
            expression: {
                kind: ts.SyntaxKind.BinaryExpression,
                left: {
                    kind: ts.SyntaxKind.Identifier,
                    text: identifier
                },
                ...(right ? {right} : {})
            },
            ...(getPos ? {getPos} : {})
        };
    }

    public labeledStatement(statement?: FunctionExtractor, getPos: boolean = false): FunctionExtractor {
        return {
            kind: ts.SyntaxKind.LabeledStatement,
            ...(statement ? {statement} : {}),
            ...(getPos ? {getPos} : {})
        };
    }

    private getName(text: string): {name: TextNode} {
        return {
            name: {
                kind: ts.SyntaxKind.Identifier,
                text
            }
        };
    }
}

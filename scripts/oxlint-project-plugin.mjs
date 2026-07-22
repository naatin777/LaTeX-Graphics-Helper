const maxConditionalSpreadsPerObject = {
  meta: {
    type: "suggestion",
    schema: [],
    messages: {
      tooMany:
        "Multiple conditional spreads make the object shape difficult to follow. " +
        "Prefer an explicitly constructed object.",
    },
  },

  create(context) {
    return {
      ObjectExpression(node) {
        const conditionalSpreads = node.properties.filter((property) => {
          if (property.type !== "SpreadElement") {
            return false;
          }

          const argument = property.argument;

          return (
            argument.type === "LogicalExpression" &&
            (argument.operator === "&&" || argument.operator === "||")
          );
        });

        if (conditionalSpreads.length <= 1) {
          return;
        }

        context.report({
          node: conditionalSpreads[1],
          messageId: "tooMany",
        });
      },
    };
  },
};

const requireSharpBufferInput = {
  meta: {
    type: "problem",
    schema: [],
    messages: {
      requireBuffer:
        "sharp()にはファイルパスを直接渡さず、" +
        "`const buffer = await readFile(path)`で読み込んだBufferを渡してください。",
      requireVariable:
        "`await readFile(path)`を直接sharp()へ渡さず、" +
        "const変数に代入してから渡してください。",
    },
  },

  create(context) {
    const sourceCode = context.sourceCode;
    const pathModules = ["node:path", "path"];
    const fsPromiseModules = ["node:fs/promises", "fs/promises"];

    function findVariable(node, name) {
      let scope = sourceCode.getScope(node);

      while (scope !== null) {
        const variable = scope.set.get(name);

        if (variable !== undefined) {
          return variable;
        }

        scope = scope.upper;
      }

      return undefined;
    }

    function isDefaultImportFrom(identifier, moduleName) {
      const variable = findVariable(identifier, identifier.name);

      return (
        variable?.defs.some((definition) => {
          const specifier = definition.node;
          const declaration = specifier.parent;

          return (
            specifier.type === "ImportDefaultSpecifier" &&
            declaration?.type === "ImportDeclaration" &&
            declaration.source.value === moduleName
          );
        }) ?? false
      );
    }

    function isNamedImportFrom(identifier, moduleNames, importedName) {
      const variable = findVariable(identifier, identifier.name);

      return (
        variable?.defs.some((definition) => {
          const specifier = definition.node;
          const declaration = specifier.parent;

          if (
            specifier.type !== "ImportSpecifier" ||
            declaration?.type !== "ImportDeclaration" ||
            !moduleNames.includes(declaration.source.value)
          ) {
            return false;
          }

          const imported = specifier.imported;

          return (
            (imported.type === "Identifier" &&
              imported.name === importedName) ||
            (imported.type === "Literal" && imported.value === importedName)
          );
        }) ?? false
      );
    }

    function isPathNamespaceImport(identifier) {
      const variable = findVariable(identifier, identifier.name);

      return (
        variable?.defs.some((definition) => {
          const specifier = definition.node;
          const declaration = specifier.parent;

          return (
            (specifier.type === "ImportDefaultSpecifier" ||
              specifier.type === "ImportNamespaceSpecifier") &&
            declaration?.type === "ImportDeclaration" &&
            pathModules.includes(declaration.source.value)
          );
        }) ?? false
      );
    }

    function unwrapExpression(node) {
      let current = node;

      while (
        current?.type === "TSAsExpression" ||
        current?.type === "TSTypeAssertion" ||
        current?.type === "TSNonNullExpression" ||
        current?.type === "ChainExpression"
      ) {
        current = current.expression;
      }

      return current;
    }

    function isAwaitedReadFile(node) {
      const expression = unwrapExpression(node);

      if (expression?.type !== "AwaitExpression") {
        return false;
      }

      const call = unwrapExpression(expression.argument);

      if (
        call?.type !== "CallExpression" ||
        call.callee.type !== "Identifier" ||
        call.arguments.length !== 1
      ) {
        return false;
      }

      return isNamedImportFrom(call.callee, fsPromiseModules, "readFile");
    }

    function isReadFileBuffer(identifier) {
      const variable = findVariable(identifier, identifier.name);

      if (variable === undefined || variable.defs.length !== 1) {
        return false;
      }

      const definition = variable.defs[0];
      const declarator = definition.node;

      if (declarator.type !== "VariableDeclarator") {
        return false;
      }

      const declaration = declarator.parent;

      if (
        declaration?.type !== "VariableDeclaration" ||
        declaration.kind !== "const"
      ) {
        return false;
      }

      return isAwaitedReadFile(declarator.init);
    }

    function isPathLikeName(name) {
      return (
        /path$/i.test(name) ||
        /filename$/i.test(name) ||
        /fileName$/i.test(name)
      );
    }

    function isPathBuilderCall(node) {
      const expression = unwrapExpression(node);

      if (expression?.type !== "CallExpression") {
        return false;
      }

      const callee = unwrapExpression(expression.callee);
      const pathMethods = new Set(["join", "resolve", "normalize"]);

      if (
        callee?.type === "MemberExpression" &&
        !callee.computed &&
        callee.object.type === "Identifier" &&
        callee.property.type === "Identifier" &&
        isPathNamespaceImport(callee.object) &&
        pathMethods.has(callee.property.name)
      ) {
        return true;
      }

      if (
        callee?.type === "Identifier" &&
        pathMethods.has(callee.name) &&
        isNamedImportFrom(callee, pathModules, callee.name)
      ) {
        return true;
      }

      return (
        callee?.type === "Identifier" &&
        isNamedImportFrom(callee, ["node:url", "url"], "fileURLToPath")
      );
    }

    function isDefinitelyPathInput(node, visitedVariables = new Set()) {
      const expression = unwrapExpression(node);

      if (expression === undefined) {
        return false;
      }

      if (
        expression.type === "Literal" &&
        typeof expression.value === "string"
      ) {
        return true;
      }

      if (expression.type === "TemplateLiteral") {
        return true;
      }

      if (isPathBuilderCall(expression)) {
        return true;
      }

      if (
        expression.type === "MemberExpression" &&
        !expression.computed &&
        expression.property.type === "Identifier"
      ) {
        return isPathLikeName(expression.property.name);
      }

      if (expression.type === "ConditionalExpression") {
        return (
          isDefinitelyPathInput(expression.consequent, visitedVariables) ||
          isDefinitelyPathInput(expression.alternate, visitedVariables)
        );
      }

      if (
        expression.type === "LogicalExpression" ||
        expression.type === "BinaryExpression"
      ) {
        return (
          isDefinitelyPathInput(expression.left, visitedVariables) ||
          isDefinitelyPathInput(expression.right, visitedVariables)
        );
      }

      if (expression.type !== "Identifier") {
        return false;
      }

      if (isReadFileBuffer(expression)) {
        return false;
      }

      if (isPathLikeName(expression.name)) {
        return true;
      }

      const variable = findVariable(expression, expression.name);

      if (
        variable === undefined ||
        visitedVariables.has(variable) ||
        variable.defs.length !== 1
      ) {
        return false;
      }

      visitedVariables.add(variable);

      const definition = variable.defs[0];

      if (definition.node.type !== "VariableDeclarator") {
        return false;
      }

      const initializer = definition.node.init;

      if (initializer === null) {
        return false;
      }

      if (isAwaitedReadFile(initializer)) {
        return false;
      }

      return isDefinitelyPathInput(initializer, visitedVariables);
    }

    return {
      CallExpression(node) {
        if (
          node.callee.type !== "Identifier" ||
          !isDefaultImportFrom(node.callee, "sharp")
        ) {
          return;
        }

        const input = node.arguments[0];

        if (input === undefined || input.type === "SpreadElement") {
          return;
        }

        /*
         * sharp(await readFile(sourcePath))
         *
         * Bufferとしては安全だが、指定された形式へ統一するため禁止。
         */
        if (isAwaitedReadFile(input)) {
          context.report({
            node: input,
            messageId: "requireVariable",
          });
          return;
        }

        /*
         * const sourceBuffer = await readFile(sourcePath);
         * sharp(sourceBuffer)
         */
        if (input.type === "Identifier" && isReadFileBuffer(input)) {
          return;
        }

        /*
         * 明確にパスと判断できる入力だけを禁止する。
         */
        if (isDefinitelyPathInput(input)) {
          context.report({
            node: input,
            messageId: "requireBuffer",
          });
        }
      },
    };
  },
};

export default {
  meta: {
    name: "project",
  },

  rules: {
    "max-conditional-spreads-per-object": maxConditionalSpreadsPerObject,
    "require-sharp-buffer-input": requireSharpBufferInput,
  },
};

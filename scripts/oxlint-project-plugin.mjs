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

const forbidRasterInputLimitBypass = {
  meta: {
    type: "problem",
    schema: [],
    messages: {
      bypass:
        "Use the shared path-based raster input helper; do not bypass Sharp input limits or configure input channels directly.",
    },
  },

  create(context) {
    return {
      CallExpression(node) {
        if (node.callee.type !== "Identifier" || node.callee.name !== "sharp") {
          return;
        }

        const input = node.arguments[0];
        const options = node.arguments[1];
        if (options?.type !== "ObjectExpression") {
          return;
        }

        let hasLimitInputPixels = false;
        let bypassesLimit = false;
        for (const property of options.properties) {
          if (property.type !== "Property" || property.computed) {
            continue;
          }

          const key =
            property.key.type === "Identifier"
              ? property.key.name
              : property.key.type === "Literal" && typeof property.key.value === "string"
                ? property.key.value
                : undefined;
          if (key === "limitInputPixels") {
            hasLimitInputPixels = true;
            if (property.value.type === "Literal" && property.value.value === false) {
              bypassesLimit = true;
            }
          }
          if (key === "unlimited" && property.value.type === "Literal" && property.value.value === true) {
            bypassesLimit = true;
          }
          if (key === "limitInputChannels") {
            bypassesLimit = true;
          }
        }

        const inputName = input?.type === "Identifier" ? input.name : "";
        const isBufferLikeInput = /(?:buffer|data)/iu.test(inputName);
        const readsFileDirectly =
          input?.type === "AwaitExpression" &&
          input.argument.type === "CallExpression" &&
          input.argument.callee.type === "Identifier" &&
          input.argument.callee.name === "readFile";

        if (bypassesLimit || (hasLimitInputPixels && (isBufferLikeInput || readsFileDirectly))) {
          context.report({ node, messageId: "bypass" });
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
    "forbid-raster-input-limit-bypass": forbidRasterInputLimitBypass,
  },
};

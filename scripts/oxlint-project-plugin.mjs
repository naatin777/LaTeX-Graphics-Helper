const maxConditionalSpreadsPerObject = {
  meta: {
    type: 'suggestion',
    schema: [],
    messages: {
      tooMany:
        'Multiple conditional spreads make the object shape difficult to follow. ' +
        'Prefer an explicitly constructed object.',
    },
  },

  create(context) {
    return {
      ObjectExpression(node) {
        const conditionalSpreads = node.properties.filter((property) => {
          if (property.type !== 'SpreadElement') {
            return false;
          }

          const argument = property.argument;

          return (
            argument.type === 'LogicalExpression' &&
            (argument.operator === '&&' || argument.operator === '||')
          );
        });

        if (conditionalSpreads.length <= 1) {
          return;
        }

        context.report({
          node: conditionalSpreads[1],
          messageId: 'tooMany',
        });
      },
    };
  },
};

export default {
  meta: {
    name: 'project',
  },

  rules: {
    'max-conditional-spreads-per-object': maxConditionalSpreadsPerObject,
  },
};
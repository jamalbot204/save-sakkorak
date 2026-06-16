module.exports = () => ({
  postcssPlugin: 'strip-layer',
  AtRule: {
    layer: function (atRule) {
      if (atRule.nodes && atRule.nodes.length > 0) {
        atRule.replaceWith(atRule.nodes);
      } else {
        atRule.remove();
      }
    },
  },
});
module.exports.postcss = true;

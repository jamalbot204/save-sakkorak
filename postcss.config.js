export default {
  plugins: {
    './postcss-strip-layer.cjs': {},
    '@csstools/postcss-oklab-function': {
      preserve: false,
    },
  }
}

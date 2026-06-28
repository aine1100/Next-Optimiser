/** @type {import('../src/types/index.js').PluginInterface} */
const plugin = {
  name: 'test-plugin',
  version: '1.0.0',

  async initialize() {},

  async analyze() {
    return [
      {
        id: 'test-plugin-custom-rule',
        title: 'Test Plugin Rule',
        description: 'Triggered by test plugin',
        severity: 'low',
        category: 'build',
        suggestion: 'This is a test suggestion',
      },
    ];
  },
};

export default plugin;

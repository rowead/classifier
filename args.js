const argv = require('yargs')
.env('WAM_IMAGE_CLASSIFIER')
.option('debug', {
  alias: 'd',
  description: 'Output debug information to stdout',
  type: 'boolean',
  default: false
})
.option('force', {
  alias: 'f',
  description: 'Ignore local cache and force classification',
  type: 'boolean',
  default: false
})
.option('path', {
  describe: 'Path to folder to process',
  type: 'string'
})
.option('verbose', {
  alias: 'v',
  describe: 'Verbose output',
  default: false,
  type: 'boolean'
})
// .demandOption(['path'])
.help()
.wrap(null)
  .argv;

module.exports = argv;

const csv = require('@fast-csv/parse');
const fs = require("fs");
const language = require('@google-cloud/language');
const path = require("path");
const {DataStream} = require("scramjet");
const {readCache, writeCache} = require('../utils.js');
const {writeToPath} = require("@fast-csv/format");

exports.command = 'text'
exports.desc = 'Classify text field in a CSV file'
exports.builder = {
  'add-newlines': {
    description: 'Add extra newline to text. This can help break up the text and hint to google that they are separate sentences.',
    type: 'boolean',
    default: true
  },
  'classify-column': {
    alias: 'cc',
    description: 'Column containing the text to classify',
    default: 'Description'
  },
  csv: {
    description: 'Path to csv file',
    demandOption: 'You must specify a file'
  },
  'id-column': {
    alias: 'ic',
    description: 'Column for the unique ID in the csv (Normally Primary Key)',
    default: 'id'
  }
}

let mlHeaderPrefix = 'ML_';
const mlFields = [
  'PERSON',
  'ORGANIZATION',
  'LOCATION',
  'UNKNOWN',
  'EVENT',
  'WORK_OF_ART',
  'CONSUMER_GOOD',
  'OTHER',
  'PHONE_NUMBER',
  'ADDRESS',
  'DATE',
  'NUMBER',
  'PRICE'
];

const mlHeaders = mlFields.map(value => value = mlHeaderPrefix + value);

exports.handler = function (argv) {
  (async () => {
    if (argv.debug) {
      console.log(argv);
    }
    try {
      // Creates a client
      const client = new language.LanguageServiceClient({
        keyFilename: path.resolve(path.join(__dirname, '../keys', argv.key))
      });
      let rows = [];
      let ids = [];
      let csvStream = {};
      DataStream.from(csvStream = csv.parseFile(argv.csv, {headers: true}))
      .setOptions({maxParallel: 1})
      .filter(row => ((row[argv.idColumn]) && (row[argv.classifyColumn])))
      .each(async row => {
        if (ids.includes(row[argv.idColumn])) {
          console.error(`${row[argv.idColumn]}`.padEnd(50) + 'Duplicate found');
          return false;
        }
        let entities = [];
        let cached = false;
        if (argv.force !== true && (cached = await readCache(argv.cacheFolder, argv.csv, row[argv.idColumn]))) {
          entities = JSON.parse(cached);
          if (argv.verbose) {
            console.log(`${row[argv.idColumn]}`.padEnd(50) + `Loaded from cache`);
          }
        }
        else {
          // Add extra newline as hints for google.
          let content = argv.addNewlines ? row[argv.classifyColumn].replace(/\n/g, '\n\n') : row[argv.classifyColumn];
          let request = {
            document: {
              content: content,
              type: 'PLAIN_TEXT',
            },
            // @TODO: turn into command options
            features: {
              // extractSyntax: true,
              extractEntities: true,
              // extractDocumentSentiment: true,
              // extractEntitySentiment: true
              // classifyText: true
            }
          };
          if (argv.language !== 'auto') {
            request.document.language = argv.language;
          }
          let results = await client.annotateText(request);
          // @TODO: add variable existence check
          entities = results[0];
          await writeCache(argv.cacheFolder, argv.csv, row[argv.idColumn], entities);
          if (argv.verbose) {
            console.log(`${row[argv.idColumn]}`.padEnd(50) +  `Loaded from API`);
          }
        }
        await entities.entities.forEach(entity => {
          if (!mlHeaders.includes('ML_' + entity.type)) {
            mlHeaders.push('ML_' + entity.type);
          }
          if (!(row['ML_' + entity.type])) {
            row['ML_' + entity.type] = '';
          }
          if (entity.metadata && entity.metadata.wikipedia_url) {
            row['ML_' + entity.type] += (row['ML_' + entity.type] ? argv.delimiter : '') + entity.name + '|' + entity.metadata.wikipedia_url;
          }
          else {
            row['ML_' + entity.type] += (row['ML_' + entity.type] ? argv.delimiter : '') + entity.name;
          }
        });
        rows.push(row);
        ids.push(row[argv.idColumn]);
        console.log(`${row[argv.idColumn]}`.padEnd(50) + 'Processed');
      })
      .whenEnd()
      .then(() => {
        writeToPath(path.resolve(path.basename(argv.csv, path.extname(argv.csv)) + '-enriched.csv'), rows, {
          headers: csvStream.headerTransformer.headers.concat(mlHeaders),
          delimiter: argv.delimiter
        })
        .on('error', err => console.error(err))
        .on('finish', () => console.log('Done writing.'));
        console.log('Writing output to: ' + path.resolve('./' + path.basename(argv.csv, path.extname(argv.csv)) + '-enriched.csv'));
      });
    }
    catch (error) {
      console.log(error);
    }
  })();
}
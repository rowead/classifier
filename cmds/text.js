const csv = require('@fast-csv/parse');
const fs = require("fs");
const language = require('@google-cloud/language');
const path = require("path");
const { DataStream } = require("scramjet");
const {writeToPath} = require("@fast-csv/format");

exports.command = 'text'
exports.desc = 'Classify text'
exports.builder = {
  csv: {
    description: 'Path to csv file',
    demandOption: 'You must specify a file'
  },
  'id-column': {
    alias: 'ic',
    description: 'Column for the unique ID in the csv (Normally Primary Key)',
    default: 'id'
  },
  'classify-column': {
    alias: 'cc',
    description: 'Column containing the text to classify',
    default: 'Description'
  },
  'add-newlines': {
    description: 'Add extra newline to text. This can help break up the text and hint to google that they are separate sentences.',
    type: 'boolean',
    default: true
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
    try {
      // Creates a client
      const client = new language.LanguageServiceClient({
        keyFilename: path.resolve(path.join(__dirname, '../keys', argv.key))
      });
      let rows = [];
      let csvStream = {};
      DataStream.from(csvStream = csv.parseFile(argv.csv, { headers: true }))
        .setOptions({maxParallel: 1})
        .each( async row => {
          let entities = [];
          if (argv.force !== true && fs.existsSync(`${argv.csv}-${row[argv.idColumn]}.json`)) {
            let rawdata = fs.readFileSync(`${argv.csv}-${row[argv.idColumn]}.json`);
            entities = JSON.parse(rawdata);
            if (argv.verbose) {
              console.log(`loaded ${row[argv.idColumn]} from cache`);
            }
          } else {
            // Add extra newline as hints for google.
            let content = argv.addNewlines ? row[argv.classifyColumn].replace(/\n/g, '\n\n') : row[argv.classifyColumn];
            const request = {
              document: {
                content: content,
                type: 'PLAIN_TEXT'
              },
              features: {
                extractSyntax: true,
                extractEntities: true,
                extractDocumentSentiment: true,
                extractEntitySentiment: true
                // classifyText: true
              }
            };
            let results = await client.annotateText(request);
            // @TODO: add variable existence check
            entities = results[0];
            fs.writeFileSync(`${argv.csv}-${row[argv.idColumn]}.json`, JSON.stringify(entities, null, 2),);
            if (argv.verbose) {
              console.log(`loaded ${row[argv.idColumn]} from API`);
            }
          }
          await entities.entities.forEach(entity => {
            if (!mlHeaders.includes('ML_' + entity.type)) {
              mlHeaders.push('ML_' + entity.type);
            }
            if (!(Array.isArray(row['ML_' + entity.type]) && row['ML_' + entity.type].length)) {
              row['ML_' + entity.type] = [];
            }
            if (entity.metadata && entity.metadata.wikipedia_url) {
              row['ML_' + entity.type].push(entity.name + ' | ' + entity.metadata.wikipedia_url);
            } else {
              row['ML_' + entity.type].push(entity.name);
            }
          });
          rows.push(row);
          console.log(`Processed Row ${row[argv.idColumn]}.`);
          }
        )
        .whenEnd()
        .then(() => {
          writeToPath(path.resolve('./' + path.basename(argv.csv,path.extname(argv.csv)) + '-enriched.csv'), rows, {
            headers: csvStream.headerTransformer.headers.concat(mlHeaders)
          })
          .on('error', err => console.error(err))
          .on('finish', () => console.log('Done writing.'));
          console.log('Writing output to: ' + path.resolve('./' + path.basename(argv.csv,path.extname(argv.csv)) + '-enriched.csv'));
        });
    } catch (error) {
      console.log(error);
    }
  })();
}
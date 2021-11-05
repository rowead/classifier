const csv = require('@fast-csv/parse');
const fs = require("fs");
const language = require('@google-cloud/language');
const path = require("path");

exports.command = 'text'
exports.desc = 'Classify text'
exports.builder = {
  csv: {
    description: 'Path to csv file',
    demandOption: 'You must specify a file'
  },
  id: {
    alias: 'id-column',
    description: 'Column for the unique ID in the csv (Normally Primary Key)',
    default: 'id'
  },
  column: {
    alias: 'classify-column',
    description: 'Column containing the text to classify',
    default: 'Description'
  }
}

exports.handler = function (argv) {
  try {
    // Creates a client
    const client = new language.LanguageServiceClient({
      keyFilename: path.resolve(path.join(__dirname, '../keys', argv.key))
    });
    let entities = [];
    let csvStream = csv.parseFile(argv.csv, { headers: true })
    .on('error', error => console.error(error))
    .on('data', async row => {
      csvStream.pause();
      if (argv.force !== true && fs.existsSync(`${argv.csv}-${row[argv.idColumn]}.json`)) {
        let rawdata = fs.readFileSync(`${argv.csv}-${row[argv.idColumn]}.json`);
        entities = JSON.parse(rawdata);
        console.log(`loaded ${row[argv.idColumn]} from cache`);
      } else {
        const document = {
          content: row[argv.classifyColumn],
          type: 'PLAIN_TEXT',
        };
        results = await client.analyzeEntities({document});
        // @TODO: add variable existence check
        entities = results[0];
        fs.writeFileSync(`${argv.csv}-${row[argv.idColumn]}.json`, JSON.stringify(entities, null, 2),);
        console.log(`loaded ${row[argv.idColumn]} from API`);
      }
      row.entities = [];
      entities.entities.forEach(entity => row.entities.push({name: entity.name, type: entity.type }));
      // console.log(`${row.id} - ${row.Title}\n--\n${row.Description}\n` + JSON.stringify(row.entities, null, 2));
      csvStream.resume();
    })
    .on('end', rowCount => console.log(`Parsed ${rowCount} rows`));

  } catch (error) {
    console.log(error);
  }
}
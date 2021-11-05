#!/usr/bin/env node
const language = require('@google-cloud/language');
const fs = require("fs");
const path = require("path");
const args = require("./args");
const csv = require('@fast-csv/parse');

(async () => {
  try {
    // Creates a client
    const client = new language.LanguageServiceClient({
      keyFilename: path.resolve(path.join(__dirname, 'keys', args.key))
    });
    let entities = [];
    let csvStream = csv.parseFile('dwyer-head.csv', { headers: true })
      .on('error', error => console.error(error))
      .on('data', async row => {
        csvStream.pause();
        if (args.force !== true && fs.existsSync(`./dwyer-head.csv-${row.id}.json`)) {
          let rawdata = fs.readFileSync(`./dwyer-head.csv-${row.id}.json`);
          entities = JSON.parse(rawdata);
          console.log(`loaded ${row.id} from cache`);
        } else {
          const document = {
            content: row.Description,
            type: 'PLAIN_TEXT',
          };
          entities = await client.analyzeEntities({document});
          fs.writeFileSync(`./dwyer-head.csv-${row.id}.json`, JSON.stringify(entities, null, 2),);
          console.log(`loaded ${row.id} from API`);
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
})();
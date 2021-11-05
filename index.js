#!/usr/bin/env node
const args = require('./args');
const fs = require('fs');
let path = require('path');
const { writeToPath } = require('@fast-csv/format');

const imageTypes = [
  '.jpeg',
  '.jpg',
  '.png'
];

if (args.debug) {
  console.log(args)
}

(async () => {
  try {
    let rows = [];
    const files = fs.readdirSync(args.path);

    if (args.debug) {
      console.log(files);
    }

    const vision = require('@google-cloud/vision');
    const client = new vision.ImageAnnotatorClient({
      keyFilename: path.resolve(path.join(__dirname, 'keys', args.key))
    });

    for (const file of files) {
      let labels = {};
      if (imageTypes.includes(path.extname(file))) {
        if (args.force !== true && files.includes(file + ".json")) {
          console.log(file);
          let rawdata = fs.readFileSync(path.join(args.path, file) + ".json");
          labels = await JSON.parse(rawdata);
        } else {
          const [result] = await client.labelDetection(path.join(args.path, file));
          labels = result.labelAnnotations;
          console.log(path.join(args.path, file) +":");
          fs.writeFileSync(path.join(args.path, file) + '.json', JSON.stringify(labels, null, 2),);
        }
        let row = {
          file: file,
          path: args.path,
          labels: []
        }
        labels.forEach(label => row.labels.push(label.description));

        labels.forEach(label => process.stdout.write(label.description + ","));
        console.log('\n--')
        rows.push(row);
      } else {
        // console.log("Skipping: " + file + "extension " + path.extname(file));
      }
    }
    writeToPath(path.resolve(args.path, 'labels.csv'), rows, {
      headers: true
    })
      .on('error', err => console.error(err))
      .on('finish', () => console.log('Done writing.'));
  } catch (error) {
    console.log(error);
  }
})();
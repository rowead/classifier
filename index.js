#!/usr/bin/env node
const args = require('./args');
const fs = require('fs');
var path = require('path');

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
    const files = fs.readdirSync(args.path);
    console.log(files);

    const vision = require('@google-cloud/vision');
    const client = new vision.ImageAnnotatorClient();

    for (const file of files) {
      let labels = {};
      if (imageTypes.includes(path.extname(file))) {
        if (!args.force && files.includes(file + ".json")) {
          console.log("Already processed: " + file);
          let rawdata = fs.readFileSync(path.join(args.path, file));
          labels = await JSON.parse(rawdata);
        } else {
          const [result] = await client.labelDetection(path.join(args.path, file));
          labels = result.labelAnnotations;
          console.log(path.join(args.path, file) + ' Labels:');
          fs.writeFileSync(path.join(args.path, file) + '.json', JSON.stringify(labels, null, 2),);
          // labels.forEach(label => console.log(label.description));
        }
        labels.forEach(label => console.log(label.description));
      } else {
        console.log("Skipping: " + file + "extension " + path.extname(file));
      }
    }
  } catch {
  }
})();
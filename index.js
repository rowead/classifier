#!/usr/bin/env node
const args = require('./args');
const fs = require('fs');
var path = require('path');

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
      const [result] = await client.labelDetection(path.join(args.path, file));
      const labels = result.labelAnnotations;
      console.log(path.join(args.path, file) + ' Labels:');
      labels.forEach(label => console.log(label.description));
    }
  } catch {
  }
})();
const fs = require('fs');
let path = require('path');
const {writeToPath} = require('@fast-csv/format');
const vision = require('@google-cloud/vision');
const {readCache, writeCache} = require("../utils.js");

exports.command = 'images'
exports.desc = 'Classify images within a folder'
exports.builder = {
  path: {
    description: 'Path to folder to process',
    demandOption: 'You must specify a path to a folder containing images',
    type: 'string'
  }
}

exports.handler = async function (argv) {
  const imageTypes = [
    '.jpeg',
    '.jpg',
    '.png'
  ];

  if (argv.debug) {
    console.log(args)
  }

  try {
    let rows = [];
    const files = fs.readdirSync(argv.path);

    if (argv.debug) {
      console.log(files);
    }

    const client = new vision.ImageAnnotatorClient({
      keyFilename: path.resolve(path.join(__dirname, '../keys', argv.key))
    });

    for (const file of files) {
      let labels = {};
      if (imageTypes.includes(path.extname(file))) {
        let cached = false;
        if (argv.force !== true && (cached = await readCache(argv.cacheFolder, argv.path, file, false))) {
          labels = await JSON.parse(cached);
          if (argv.verbose) {
            console.log(`${file}:`.padEnd(50) + `Loading labels from cache`);
          }
        } else {
          const [result] = await client.labelDetection(path.join(argv.path, file));
          labels = result.labelAnnotations;
          if (argv.verbose) {
            console.log(path.join(argv.path, file).padEnd(50) + ": Loading labels from API");
          }
          await writeCache(argv.cacheFolder, argv.path, file, labels, false);
        }
        let row = {
          file: file,
          path: argv.path,
          labels: []
        }
        labels.forEach(label => row.labels.push(label.description));

        if (argv.debug) {
          labels.forEach(label => process.stdout.write(label.description + ","));
          console.log('\n--')
        }
        console.log(`${file}:`.padEnd(50) + `Processed`);
        rows.push(row);
      } else {
        if (argv.verbose) {
          console.log(`${file}`.padEnd(50) + `Skipped`);
        }
      }
    }
    writeToPath(path.resolve(argv.path, 'labels.csv'), rows, {
      headers: true
    })
    .on('error', err => console.error(err))
    .on('finish', () => console.log('Done writing.'));
    console.log('Writing output to: ' + path.resolve(argv.path, 'labels.csv'));
  } catch (error) {
    console.log(error);
  }
}
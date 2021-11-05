const fs = require('fs');
let path = require('path');
const { writeToPath } = require('@fast-csv/format');
const vision = require('@google-cloud/vision');

exports.command = 'images'
exports.desc = 'Classify images within a folder'
exports.builder = {
  path: {
    description: 'Path to folder to process',
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
        if (argv.force !== true && files.includes(file + ".json")) {
          console.log(file);
          let rawdata = fs.readFileSync(path.join(argv.path, file) + ".json");
          labels = await JSON.parse(rawdata);
        } else {
          const [result] = await client.labelDetection(path.join(argv.path, file));
          labels = result.labelAnnotations;
          console.log(path.join(argv.path, file) +":");
          fs.writeFileSync(path.join(argv.path, file) + '.json', JSON.stringify(labels, null, 2),);
        }
        let row = {
          file: file,
          path: argv.path,
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
    writeToPath(path.resolve(argv.path, 'labels.csv'), rows, {
      headers: true
    })
    .on('error', err => console.error(err))
    .on('finish', () => console.log('Done writing.'));
  } catch (error) {
    console.log(error);
  }
}
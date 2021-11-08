const createReadStream = require('fs').createReadStream
const fs = require('fs');
let path = require('path');
const {writeToPath} = require('@fast-csv/format');
const {readCache, writeCache} = require("../utils.js");
const vision = require('@google-cloud/vision');
const ComputerVisionClient = require('@azure/cognitiveservices-computervision').ComputerVisionClient;
const ApiKeyCredentials = require('@azure/ms-rest-js').ApiKeyCredentials;

exports.command = 'images'
exports.desc = 'Classify images within a folder'
exports.builder = {
  path: {
    description: 'Path to folder to process',
    demandOption: 'You must specify a path to a folder containing images',
    type: 'string'
  },
  'microsoft-endpoint': {
    alias: 'ms-endpont',
    description: 'Microsoft endpoint for API'
  },
  'microsoft-key': {
    alias: 'ms-key',
    description: 'Microsoft API key, best to use env cariabel',
  },
  vendor: {
    description: 'Cloud vendor API to use',
    type: 'string',
    default: 'google',
    choices: ['google', 'microsoft']
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

    // Google
    const client = new vision.ImageAnnotatorClient({
      keyFilename: path.resolve(path.join(__dirname, '../keys', argv.key))
    });
    //Microsoft
    const key = argv.microsoftKey;
    const endpoint = argv.microsoftEndpoint;
    const computerVisionClient = new ComputerVisionClient(
      new ApiKeyCredentials({
        inHeader: {
          'Ocp-Apim-Subscription-Key': key
        }
      })
      , endpoint
    );

    for (const file of files) {
      let results = {};
      if (imageTypes.includes(path.extname(file))) {
        let cached = false;
        if (argv.force !== true && (cached = await readCache(argv.cacheFolder, argv.path, file + '-' + argv.vendor, false))) {
          results = await JSON.parse(cached);
          if (argv.verbose) {
            console.log(`${file}:`.padEnd(50) + "Loading labels from cache");
          }
        }
        else {
          if (argv.verbose) {
            console.log(path.join(argv.path, file).padEnd(50) + "Loading labels from API");
          }
          if (argv.vendor === 'microsoft') {
            results = (await computerVisionClient.describeImageInStream(
              () => createReadStream(path.join(argv.path, file))
            ));
          }
          else {
            const [result] = await client.labelDetection(path.join(argv.path, file));
            results = result;
          }
          await writeCache(argv.cacheFolder, argv.path, file + '-' + argv.vendor, results, false);
        }

        let row = {
          file: file,
          path: argv.path,
          ML_LABELS: ''
        }
        if (argv.vendor === 'microsoft') {
          row.ML_CAPTION = results.captions[0].text;
          results.tags.forEach(label => row.ML_LABELS += (row.ML_LABELS ? argv.delimiter : '') + label);
          if (argv.verbose) {
            console.log(`\tCaption: ${results.captions[0].text} (${results.captions[0].confidence.toFixed(2)} confidence)`);
            console.log(`\tLabels: ${row.ML_LABELS}`);
          }
        }
        else {
          results.labelAnnotations.forEach(label => row.ML_LABELS += (row.ML_LABELS ? argv.delimiter : '') + label.description);
          if (argv.verbose) {
            console.log(`\tLabels: ${row.ML_LABELS.replaceAll('\t', ',')}`);
          }
        }
        if (argv.debug) {
        }
        console.log(`${file}:`.padEnd(50) + `Processed`);
        rows.push(row);
      }
      else {
        if (argv.verbose) {
          console.log(`${file}`.padEnd(50) + `Skipped`);
        }
      }
    }
    writeToPath(path.resolve(argv.path, 'labels.csv'), rows, {
      headers: true,
      delimiter: argv.delimiter
    })
    .on('error', err => console.error(err))
    .on('finish', () => console.log('Done writing.'));
    console.log('Writing output to: ' + path.resolve(argv.path, 'labels.csv'));
  } catch (error) {
    console.log(error);
  }
}
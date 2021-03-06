const createReadStream = require('fs').createReadStream
const fs = require('fs');
let path = require('path');
const {writeToPath} = require('@fast-csv/format');
const {cacheImage, checkFileWriteable,  readCache, writeCache, checkFileReadable} = require("../utils.js");
const vision = require('@google-cloud/vision');
const ComputerVisionClient = require('@azure/cognitiveservices-computervision').ComputerVisionClient;
const ApiKeyCredentials = require('@azure/ms-rest-js').ApiKeyCredentials;
const homeDir = require('os').homedir();

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
  'output-file': {
    alias: 'out',
    description: "Filename for CSV, will be written to user's home directory",
    default: 'labels.csv'
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
    '.png',
    '.tif',
    '.tiff'
  ];

  if (argv.debug) {
    console.log(args)
  }

  try {
    // Abort early if output is not writeable or aborted by user choice
    let overwrite = await checkFileWriteable(path.resolve(homeDir, argv.outputFile));
    if (!overwrite) {
      console.log("Aborting");
      process.exit(1);
    }

    let rows = [];
    const files = fs.readdirSync(argv.path);

    if (argv.debug) {
      console.log(files);
    }

    if (argv.vendor === 'google') {
      if (!(await checkFileReadable(path.resolve(path.join(__dirname, '../keys', argv.key))))) {
        console.error('Error reading key file, Aborting.');
        process.exit(1);
      }
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
          let cachedImage = await cacheImage(argv.cacheFolder, argv.path, file, argv.force);
          if (argv.vendor === 'microsoft') {
            results = (await computerVisionClient.describeImageInStream(
              () => createReadStream(cachedImage)
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
            console.log(`\tLabels: ${row.ML_LABELS.replaceAll(argv.delimiter, ', ')}`);
          }
        }
        else {
          results.labelAnnotations.forEach(label => row.ML_LABELS += (row.ML_LABELS ? argv.delimiter : '') + label.description);
          if (argv.verbose) {
            console.log(`\tLabels: ${row.ML_LABELS.replaceAll(argv.delimiter, ', ')}`);
          }
        }
        if (argv.debug) {
        }
        console.log(`${file}:`.padEnd(50) + `Processed`);
        rows.push(row);
        // console.log('starting sleep cycle');
        // await sleep(5000);
        // console.log('waking back up');
      }
      else {
        if (argv.verbose) {
          console.log(`${file}`.padEnd(50) + `Skipped`);
        }
      }
    }
    writeToPath(path.resolve(homeDir, argv.outputFile), rows, {
      headers: true,
      delimiter: argv.delimiter
    })
    .on('error', err => console.error(err))
    .on('finish', () => console.log('Done writing.'));
    console.log('Writing output to: ' + path.resolve(homeDir, argv.outputFile));
  } catch (error) {
    console.log(error);
  }
}
const fs = require('fs');
const path = require('path');
const sanitize = require('sanitize-filename');
const sharp = require('sharp');

async function cacheImage(cache,cachePath, fileName, force = false) {
  const cacheDetails = getCacheDetails(cache, cachePath, fileName, false);
  
  //console.log(cacheDetails);
  let cachedImageExists = false;
  try {
    fs.accessSync(path.join(cacheDetails.cacheFilePath, fileName));
    cachedImageExists = true;
  }
  catch (error) {
    cachedImageExists = false;
  }

  if (!force && cachedImageExists) {
    // use cache
    return path.join(cacheDetails.cacheFilePath, fileName);
  }
  else {
    try {
      let metadata = await sharp(path.join(cachePath, fileName)).metadata();
      // @TODO: write jpg with correct filename
      await sharp(path.join(cachePath, fileName))
        .resize({width: 640, height: 480, fit: 'inside'})
        .toFormat('jpeg')
        .toFile(path.join(cacheDetails.cacheFilePath, fileName));
      return path.join(cacheDetails.cacheFilePath, fileName);
    }
    catch (error) {
      process.exit(1);
    }
  }
}

function cleanPath(filePath) {
  return sanitize(filePath).replaceAll(/[\&\.\?\,]/ig, '_');
}

function getCacheDetails(cache, cachePath, key, optimize) {
  let cacheDetails = {}
  const _cachePath = cleanPath(cachePath);
  const _key = cleanPath(key);
  const _keyFullPath = optimize ? _key.match(/.{1,3}/g).join(path.sep) : _key;
  const _keyPath = path.dirname(_keyFullPath);
  cacheDetails.keyFilename = path.basename(_keyFullPath) + '.json';
  cacheDetails.cacheFilePath = path.resolve(__dirname, cache, _cachePath, path.join(_keyPath));
  
  return cacheDetails;
}

async function readCache(cache, cachePath, key, optimize = true) {
  const cacheDetails = getCacheDetails(cache, cachePath, key, optimize);
  try {
    return fs.readFileSync(path.join(cacheDetails.cacheFilePath, cacheDetails.keyFilename));
  }
  catch (error) {
    console.error(`Could not read cache file ${path.join(cacheDetails.cacheFilePath, cacheDetails.keyFilename)}`);
  }
  return false;
}

async function writeCache(cache, cachePath, key, payload, optimize = true, pretty = true) {
  const cacheDetails = getCacheDetails(cache, cachePath, key, optimize);
  try {
    fs.mkdirSync(cacheDetails.cacheFilePath,{recursive: true});
    fs.writeFileSync(
      path.join(cacheDetails.cacheFilePath, cacheDetails.keyFilename),
      pretty ? JSON.stringify(payload, null, 2) : payload
    );
  }
  catch (error) {
    console.log(error);
  }
}

module.exports = {
  cacheImage,
  readCache,
  writeCache
}
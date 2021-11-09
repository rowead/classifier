const fs = require('fs');
const path = require('path');
const sanitize = require('sanitize-filename');
const sharp = require('sharp');

async function cacheImage(cache,cachePath, fileName, force = false) {
  const cacheDetails = getCacheDetails(cache, cachePath, fileName, false);
  const cachedImagePath = path.join(
    cacheDetails.cacheFilePath,
    cleanPath(fileName) + '.jpg'
  );

  let cachedImageExists = false;

  try {
    fs.accessSync(cachedImagePath);
    cachedImageExists = true;
  }
  catch (error) {
    cachedImageExists = false;
  }

  if (!force && cachedImageExists) {
    // use cache
    return cachedImagePath;
  }
  else {
    try {
      fs.mkdirSync(cacheDetails.cacheFilePath,{recursive: true});
      let metadata = await sharp(path.join(cachePath, fileName)).metadata();
      await sharp(path.join(cachePath, fileName))
        .resize({width: 640, height: 480, fit: 'inside'})
        .jpeg({quality: 90,})
        .toFile(cachedImagePath);
      return cachedImagePath;
    }
    catch (error) {
      process.exit(1);
    }
  }
}

function cleanPath(filePath, fixCase = false) {
  filePath = sanitize(filePath).replaceAll(/[\&\.\?\,]/ig, '_');
  if (fixCase) {
    return filePath.toLowerCase();
  }
  return filePath
}

function getCacheDetails(cache, cachePath, key, optimize) {
  let cacheDetails = {}
  const _cachePath = cleanPath(cachePath);
  const _key = cleanPath(key);
  const _keyFullPath = optimize ? _key.match(/.{1,3}/g).join(path.sep) : _key;
  const _keyPath = path.dirname(_keyFullPath);
  cacheDetails.keyFilename = path.basename(_keyFullPath) + '.json';
  cacheDetails.cacheFilePath = path.resolve(__dirname, cache, _cachePath, path.join(_keyPath));
  cacheDetails.cacheFullPath = path.join(cacheDetails.cacheFilePath, cacheDetails.keyFilename);
  
  return cacheDetails;
}

async function readCache(cache, cachePath, key, optimize = true) {
  const cacheDetails = getCacheDetails(cache, cachePath, key, optimize);
  try {
    return fs.readFileSync(cacheDetails.cacheFullPath);
  }
  catch (error) {
    console.error(`Could not read cache file ${cacheDetails.cacheFullPath}`);
  }
  return false;
}

async function writeCache(cache, cachePath, key, payload, optimize = true, pretty = true) {
  const cacheDetails = getCacheDetails(cache, cachePath, key, optimize);
  try {
    fs.mkdirSync(cacheDetails.cacheFilePath,{recursive: true});
    fs.writeFileSync(
      cacheDetails.cacheFullPath,
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
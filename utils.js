const fs = require('fs');
const path = require('path');
const sanitize = require('sanitize-filename');

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
  readCache,
  writeCache
}
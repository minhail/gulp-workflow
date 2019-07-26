const fs = require('fs');
// const path = require('path');

module.exports = {
  dirExist(dirPath) {
    try {
      let stat = fs.statSync(dirPath);
      return stat.isDirectory;
    } catch (err) {
      if (err.code === 'ENOENT') {
        return false;
      } else {
        throw new Error(err);
      }
    }
  },
  fileExist(filePath) {
    try {
      let stat = fs.statSync(filePath);
      return stat.isFile();
    } catch (err) {
      if (err.code === 'ENOENT') {
        return false;
      } else {
        throw new Error(err);
      }
    }
  }
};
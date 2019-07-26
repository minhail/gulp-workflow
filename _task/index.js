const fs = require('fs');
const path = require('path');

module.exports = function(option) {
  fs.readdirSync(__dirname).filter((file) => {
    // 筛选Task开头的任务js
    return file.indexOf('.') !== 0 && file.indexOf('Task') === 0;
  }).forEach((file) => {
    // 加载Task
    require(path.join(__dirname, file))(option);
  });
};
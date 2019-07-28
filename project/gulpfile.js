const fs = require('fs');
const path = require('path');

let deep = 3;
function findTask(taskPath) {
  if (--deep < 0) {
    throw new Error('require tasks!');
  } else {
    taskPath = path.join('../', taskPath);
    if (fs.existsSync(taskPath)) {
      require(taskPath);
    } else {
      findTask(taskPath);
    }
  }
}

findTask('_task');

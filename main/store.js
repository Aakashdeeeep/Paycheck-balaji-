const fs = require('fs');
const path = require('path');
const { app } = require('electron');

class Store {
  constructor() {
    this.path = path.join(app.getPath('userData'), 'window-state.json');
    this.data = this._load();
  }

  _load() {
    try {
      return JSON.parse(fs.readFileSync(this.path, 'utf8'));
    } catch {
      return {};
    }
  }

  get(key, defaultVal) {
    return this.data[key] !== undefined ? this.data[key] : defaultVal;
  }

  set(key, val) {
    this.data[key] = val;
    fs.writeFileSync(this.path, JSON.stringify(this.data, null, 2));
  }
}

module.exports = Store;

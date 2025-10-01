const fs = require('fs');
const Logger = require('../core/logger');

class FileManager {
  static async readJson(filePath) {
    try {
      const data = await fs.promises.readFile(filePath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      Logger.error('Failed to read JSON', { filePath, error: error?.message });
      throw error;
    }
  }

  static async writeJson(filePath, data) {
    try {
      const json = JSON.stringify(data, null, 2);
      await fs.promises.writeFile(filePath, json, 'utf8');
    } catch (error) {
      Logger.error('Failed to write JSON', { filePath, error: error?.message });
      throw error;
    }
  }
}

module.exports = FileManager;



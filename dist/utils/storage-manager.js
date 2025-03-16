// ProxyEthica Storage Manager
class StorageManager {
  static async get(keys) {
    return new Promise((resolve) => {
      chrome.storage.local.get(keys, resolve);
    });
  }
  static async set(items) {
    return new Promise((resolve) => {
      chrome.storage.local.set(items, resolve);
    });
  }
}

if (typeof self !== 'undefined') {
  self.StorageManager = StorageManager;
} else if (typeof window !== 'undefined') {
  window.StorageManager = StorageManager;
}

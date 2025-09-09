// indexeddb-manager.js
const DB_NAME = "jcfrutas_data";
const DB_VERSION = 1;
const STORE_FINCAS = "fincas";

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_FINCAS)) {
        const os = db.createObjectStore(STORE_FINCAS, { keyPath: "_id" });
        os.createIndex("adminAlias", "adminAlias", { unique: false });
        os.createIndex("__pending", "__pending", { unique: false });
      }
    };
    request.onsuccess = (e) => resolve(e.target.result);
    request.onerror = (e) => reject(e.target.error);
  });
}

export async function putFinca(finca) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_FINCAS, "readwrite");
    const store = tx.objectStore(STORE_FINCAS);
    const req = store.put(finca);
    req.onsuccess = () => resolve(req.result);
    req.onerror = (e) => reject(e.target.error);
  });
}

export async function putFincas(fincas) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_FINCAS, "readwrite");
    const store = tx.objectStore(STORE_FINCAS);
    fincas.forEach(f => store.put(f));
    tx.oncomplete = () => resolve();
    tx.onerror = (e) => reject(e.target.error);
  });
}

export async function getAllFincas() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_FINCAS, "readonly");
    const store = tx.objectStore(STORE_FINCAS);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = (e) => reject(e.target.error);
  });
}

export async function getPendingFincas() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_FINCAS, "readonly");
    const store = tx.objectStore(STORE_FINCAS);
    const index = store.index("__pending");
    const req = index.getAll(true); // get all where __pending === true
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = (e) => reject(e.target.error);
  });
}

export async function deleteFincaById(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_FINCAS, "readwrite");
    const store = tx.objectStore(STORE_FINCAS);
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = (e) => reject(e.target.error);
  });
}

export async function clearFincasStore() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_FINCAS, "readwrite");
    const store = tx.objectStore(STORE_FINCAS);
    const req = store.clear();
    req.onsuccess = () => resolve();
    req.onerror = (e) => reject(e.target.error);
  });
}

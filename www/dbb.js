// db.js (versión mejorada y compatible)
const DB_NAME = 'miAppFincaDB';
const DB_VERSION = 1;
const STORE_FRUTAS = 'frutas';
const STORE_PRECIOS = 'precios';
const STORE_PENDING_RECOGIDAS = 'pending_recogidas';

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_FRUTAS)) {
        db.createObjectStore(STORE_FRUTAS, { keyPath: 'key' });
      }
      if (!db.objectStoreNames.contains(STORE_PRECIOS)) {
        db.createObjectStore(STORE_PRECIOS, { keyPath: 'key' });
      }
      if (!db.objectStoreNames.contains(STORE_PENDING_RECOGIDAS)) {
        db.createObjectStore(STORE_PENDING_RECOGIDAS, { autoIncrement: true });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = (e) => reject(e.target.error);
  });
}

/**
 * withStore: ejecuta cb(store). Si cb retorna una Promise, la espera.
 * Resuelve cuando la transacción termina; devuelve el valor retornado por cb (si aplica).
 */
async function withStore(storeName, mode, cb) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, mode);
    const store = tx.objectStore(storeName);
    // Ejecutar cb y soportar si devuelve Promise o valor inmediato
    try {
      const maybePromise = cb(store);
      Promise.resolve(maybePromise).catch(err => {
        // Si cb falla, abortar la transacción y rechazar
        try { tx.abort(); } catch (e) {}
        reject(err);
      });
    } catch (err) {
      try { tx.abort(); } catch (e) {}
      return reject(err);
    }

    tx.oncomplete = () => resolve();
    tx.onerror = (e) => reject(e.target.error);
    tx.onabort = (e) => reject(e.target.error || new Error('Transaction aborted'));
  });
}

// ----------------- FRUTAS -----------------
async function saveFruits(fincaId, frutasArray) {
  await withStore(STORE_FRUTAS, 'readwrite', (store) => {
    frutasArray.forEach(fruta => {
      const key = `${fincaId}:${fruta.id ?? fruta._id ?? fruta.key ?? fruta.nombre}`;
      store.put({ key, fincaId, ...fruta });
    });
  });
}

async function getFruitsByFinca(fincaId) {
  const res = [];
  await withStore(STORE_FRUTAS, 'readonly', (store) => {
    const req = store.openCursor();
    req.onsuccess = (e) => {
      const cursor = e.target.result;
      if (cursor) {
        if (cursor.value.fincaId === fincaId) res.push(cursor.value);
        cursor.continue();
      }
    };
  });
  return res;
}

async function getFruitByKey(key) {
  return new Promise(async (resolve, reject) => {
    const db = await openDB();
    const tx = db.transaction(STORE_FRUTAS, 'readonly');
    const store = tx.objectStore(STORE_FRUTAS);
    const req = store.get(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror = (e) => reject(e.target.error);
  });
}

// ----------------- PRECIOS -----------------
async function savePrices(pricesArray) {
  await withStore(STORE_PRECIOS, 'readwrite', (store) => {
    pricesArray.forEach(p => {
      const key = p.key ?? p.id ?? p.frutaId ?? p.nombre ?? JSON.stringify(p);
      store.put({ key, ...p });
    });
  });
}

async function getAllPrices() {
  const out = [];
  await withStore(STORE_PRECIOS, 'readonly', (store) => {
    const req = store.openCursor();
    req.onsuccess = (e) => {
      const c = e.target.result;
      if (c) { out.push(c.value); c.continue(); }
    };
  });
  return out;
}

async function getPriceByKey(key) {
  return new Promise(async (resolve, reject) => {
    const db = await openDB();
    const tx = db.transaction(STORE_PRECIOS, 'readonly');
    const store = tx.objectStore(STORE_PRECIOS);
    const req = store.get(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror = (e) => reject(e.target.error);
  });
}

// ----------------- PENDING RECOGIDAS -----------------
async function addPendingRecogida(recogidaObj) {
  return new Promise(async (resolve, reject) => {
    try {
      const db = await openDB();
      const tx = db.transaction(STORE_PENDING_RECOGIDAS, 'readwrite');
      const store = tx.objectStore(STORE_PENDING_RECOGIDAS);
      const req = store.add({ recogida: recogidaObj, createdAt: new Date().toISOString() });
      req.onsuccess = () => resolve(req.result);
      req.onerror = (e) => reject(e.target.error);
    } catch (err) {
      reject(err);
    }
  });
}

async function getAllPendingRecogidas() {
  const out = [];
  await withStore(STORE_PENDING_RECOGIDAS, 'readonly', (store) => {
    const req = store.openCursor();
    req.onsuccess = (e) => {
      const c = e.target.result;
      if (c) { out.push({ key: c.key, ...c.value }); c.continue(); }
    };
  });
  return out;
}

async function deletePendingRecogida(key) {
  await withStore(STORE_PENDING_RECOGIDAS, 'readwrite', (store) => {
    store.delete(key);
  });
}

async function clearPendingRecogidas() {
  await withStore(STORE_PENDING_RECOGIDAS, 'readwrite', (store) => {
    store.clear();
  });
}

async function countPendingRecogidas() {
  return new Promise(async (resolve, reject) => {
    try {
      const db = await openDB();
      const tx = db.transaction(STORE_PENDING_RECOGIDAS, 'readonly');
      const store = tx.objectStore(STORE_PENDING_RECOGIDAS);
      const req = store.count();
      req.onsuccess = () => resolve(req.result);
      req.onerror = (e) => reject(e.target.error);
    } catch (err) {
      reject(err);
    }
  });
}

// ----------------- EXPORT -----------------
window.IDB_HELPER = {
  saveFruits,
  getFruitsByFinca,
  getFruitByKey,
  savePrices,
  getAllPrices,
  getPriceByKey,
  addPendingRecogida,
  getAllPendingRecogidas,
  deletePendingRecogida,
  clearPendingRecogidas,
  countPendingRecogidas
};

// db.js
const { openDB } = window.idb;


const DB_NAME = 'authDB';
const STORE_NAME = 'users';

export async function initDB() {
  return openDB(DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'username' });
        store.createIndex('username', 'username', { unique: true });
      }
    },
  });
}

export async function getUserFromDB(username) {
  const db = await initDB();
  return db.get(STORE_NAME, username);
}

export async function saveUserToDB(user) {
  const db = await initDB();
  const existing = await getUserFromDB(user.username);
  if (!existing) {
    await db.put(STORE_NAME, user);
  }
}
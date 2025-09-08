const { openDB } = window.idb;

const DB_NAME = 'dashboard1DB';
const STORE_NAME = 'userData';

export async function initDashboardDB() {
  return openDB(DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'username' });
      }
    },
  });
}

export async function saveDashboardData(username, data) {
  const db = await initDashboardDB();
  await db.put(STORE_NAME, { username, ...data });
}

export async function getDashboardData(username) {
  const db = await initDashboardDB();
  return await db.get(STORE_NAME, username);
}
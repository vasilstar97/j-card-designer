const DATABASE_NAME = "j-card-generator";
const STORE_NAME = "workspaces";
const WORKSPACE_KEY = "default";

let databasePromise;

function openDatabase() {
  if (!("indexedDB" in window)) {
    return Promise.reject(new Error("This browser does not support local project storage."));
  }
  if (!databasePromise) {
    databasePromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DATABASE_NAME, 1);
      request.addEventListener("upgradeneeded", () => {
        if (!request.result.objectStoreNames.contains(STORE_NAME)) {
          request.result.createObjectStore(STORE_NAME);
        }
      });
      request.addEventListener("success", () => resolve(request.result), { once: true });
      request.addEventListener("error", () => reject(request.error || new Error("Could not open local project storage.")), { once: true });
      request.addEventListener("blocked", () => reject(new Error("Local project storage is blocked by another browser tab.")), { once: true });
    });
  }
  return databasePromise;
}

export async function loadWorkspace() {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readonly");
    const request = transaction.objectStore(STORE_NAME).get(WORKSPACE_KEY);
    request.addEventListener("success", () => resolve(request.result || null), { once: true });
    request.addEventListener("error", () => reject(request.error || new Error("Could not read the saved project.")), { once: true });
    transaction.addEventListener("abort", () => reject(transaction.error || new Error("Could not read the saved project.")), { once: true });
  });
}

export async function saveWorkspace(workspace) {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).put(workspace, WORKSPACE_KEY);
    transaction.addEventListener("complete", () => resolve(), { once: true });
    transaction.addEventListener("error", () => reject(transaction.error || new Error("Could not save the project locally.")), { once: true });
    transaction.addEventListener("abort", () => reject(transaction.error || new Error("Could not save the project locally.")), { once: true });
  });
}

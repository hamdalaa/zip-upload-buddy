// Single shared passcode gate — NOT real security, MVP demo only.
// Change this passcode for your demo.
const ADMIN_PASSCODE = "teeh-2025";
const STORAGE_KEY = "teeh.admin.unlocked";

export function isAdminUnlocked(): boolean {
  try {
    return sessionStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function tryUnlockAdmin(passcode: string): boolean {
  if (passcode === ADMIN_PASSCODE) {
    try {
      sessionStorage.setItem(STORAGE_KEY, "1");
    } catch {
      /* ignore */
    }
    return true;
  }
  return false;
}

export function lockAdmin(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

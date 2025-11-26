// src/lib/ui/storageManager.ts

/**
 * Gerencia o acesso ao localStorage de forma centralizada.
 */

const TEMP_POST_KEY = "tempPostPulsarContent";
const REOPEN_POST_KEY = "reopenPostData";
const REFERRAL_CODE_KEY = "referral_code";
const TRUNCATE_PREF_KEY = "truncate_preference";

// --- Funções Genéricas ---

/**
 * Salva um item no localStorage após convertê-lo para JSON.
 * @param key A chave do item.
 * @param value O valor a ser salvo.
 */
function setItem<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Error saving item ${key} to localStorage:`, error);
  }
}

/**
 * Obtém um item do localStorage e o converte do formato JSON.
 * @param key A chave do item.
 * @returns O valor do item ou null se não for encontrado.
 */
function getItem<T>(key: string): T | null {
  try {
    const item = localStorage.getItem(key);
    return item ? (JSON.parse(item) as T) : null;
  } catch (error) {
    console.error(`Error getting item ${key} from localStorage:`, error);
    return null;
  }
}

/**
 * Remove um item do localStorage.
 * @param key A chave do item a ser removido.
 */
function removeItem(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.error(`Error removing item ${key} from localStorage:`, error);
  }
}

// --- Funções Específicas ---

// Gerenciamento do Post Temporário
export const saveTempPost = (data: unknown) => setItem(TEMP_POST_KEY, data);
export const getTempPost = <T>(): T | null => getItem<T>(TEMP_POST_KEY);
export const removeTempPost = () => removeItem(TEMP_POST_KEY);

// Gerenciamento do Post a ser Reaberto
export const saveReopenPost = (data: unknown) => setItem(REOPEN_POST_KEY, data);
export const getReopenPost = <T>(): T | null => getItem<T>(REOPEN_POST_KEY);
export const removeReopenPost = () => removeItem(REOPEN_POST_KEY);

// Gerenciamento do Código de Referência
export const saveReferralCode = (code: string) =>
  setItem(REFERRAL_CODE_KEY, code);
export const getReferralCode = (): string | null =>
  getItem<string>(REFERRAL_CODE_KEY);
export const removeReferralCode = () => removeItem(REFERRAL_CODE_KEY);

// Gerenciamento da Preferência de Truncagem
export const saveTruncatePreference = (preference: boolean) =>
  setItem(TRUNCATE_PREF_KEY, preference);
export const getTruncatePreference = (): boolean | null =>
  getItem<boolean>(TRUNCATE_PREF_KEY);

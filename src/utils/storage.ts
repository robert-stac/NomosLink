export const loadFromStorage = (key: string) => {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    return [];
  }
};


export function saveToStorage<T>(key: string, value: T) {
  try {
    const serialized = JSON.stringify(value);
    localStorage.setItem(key, serialized);
    console.log(`Saved ${key} to localStorage:`, serialized);
  } catch (error) {
    console.error(`Error saving ${key} to localStorage:`, error);
  }
}

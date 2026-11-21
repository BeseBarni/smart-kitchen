import { create } from "zustand";
import { createJSONStorage, persist, type StateStorage } from "zustand/middleware";
import { createStore } from "zustand/vanilla";
import { isSupportedLocale, type KeyValueStorage, type SupportedLocale } from "./types";

interface LanguageState {
  locale: SupportedLocale;
  hasHydrated: boolean;
  setLocale: (locale: SupportedLocale) => void;
  finishHydration: () => void;
}

export const useLanguageStorageStatus = create<{ failed: boolean }>(() => ({ failed: false }));

export function createLanguageStore(storage: KeyValueStorage, report: (failed: boolean) => void) {
  let hydrating = true;
  const guarded: StateStorage = {
    getItem: (key) => storage.getItem(key),
    setItem: (key, value) => {
      if (hydrating) return;
      try {
        const result = storage.setItem(key, value);
        if (result instanceof Promise) {
          return result.then(() => report(false), (error: unknown) => {
            console.error("Language preference could not be saved:", error);
            report(true);
          });
        }
        report(false);
      } catch (error) {
        console.error("Language preference could not be saved:", error);
        report(true);
      }
    },
    removeItem: (key) => storage.removeItem(key),
  };
  const jsonStorage = createJSONStorage<Pick<LanguageState, "locale">>(() => guarded);
  if (!jsonStorage) throw new Error("Could not initialize language storage.");
  const store = createStore<LanguageState>()(persist(
    (set) => ({
      locale: "en",
      hasHydrated: false,
      setLocale: (locale) => set({ locale }),
      finishHydration: () => set({ hasHydrated: true }),
    }),
    {
      name: "app-language-preference",
      storage: jsonStorage,
      partialize: ({ locale }) => ({ locale }),
      skipHydration: true,
      merge: (persisted, current) => {
        if (persisted === undefined) return current;
        if (typeof persisted !== "object" || persisted === null || !("locale" in persisted) || !isSupportedLocale(persisted.locale)) {
          throw new Error("Invalid saved language preference.");
        }
        return { ...current, locale: persisted.locale };
      },
      onRehydrateStorage: () => (_state, error) => {
        if (error) {
          console.error("Language preference could not be restored:", error);
          report(true);
        }
        store.getState().finishHydration();
        hydrating = false;
      },
    },
  ));
  return store;
}

const browserStorage: KeyValueStorage = {
  getItem: (key) => localStorage.getItem(key),
  setItem: (key, value) => localStorage.setItem(key, value),
  removeItem: (key) => localStorage.removeItem(key),
};

export const languageStore = createLanguageStore(browserStorage, (failed) => {
  useLanguageStorageStatus.setState({ failed });
});

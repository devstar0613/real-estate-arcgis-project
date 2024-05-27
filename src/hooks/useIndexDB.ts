import { useState, useEffect, useRef } from 'react';

const useIndexDB = <T>(key: string, initialValue: T) => {
  const [value, setValue] = useState<T | null>(null);
  const databaseRef = useRef<IDBDatabase | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const openDatabase = async () => {
      if (databaseRef.current) {
        return;
      }

			console.log('==========Here is useIndexDB!==========')
      const request = window.indexedDB.open('myDatabase', 1);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        db.createObjectStore('dataStore', { keyPath: 'key' });
      };

      request.onsuccess = async (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        databaseRef.current = db;
        const data = await getItem(db, key);
        setValue(data || initialValue);
        setIsInitialized(true);
      };

      request.onerror = (event) => {
        console.error('Error opening database:', (event.target as IDBOpenDBRequest).error);
      };
    };

    openDatabase();

    // return () => {
    //   if (databaseRef.current) {
    //     databaseRef.current.close();
    //   }
    // };
  }, [key, initialValue]);

  const setItem = async (db: IDBDatabase, key: string, value: T) => {
    const transaction = db.transaction(['dataStore'], 'readwrite');
    const objectStore = transaction.objectStore('dataStore');
    objectStore.put({ key, value });
  };

  const getItem = async (db: IDBDatabase, key: string): Promise<T | null> => {
    const transaction = db.transaction(['dataStore'], 'readonly');
    const objectStore = transaction.objectStore('dataStore');
    const request = objectStore.get(key);

    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result?.value || null);
      request.onerror = () => reject(request.error);
    });
  };

  const removeItem = async (db: IDBDatabase, key: string) => {
    const transaction = db.transaction(['dataStore'], 'readwrite');
    const objectStore = transaction.objectStore('dataStore');
    objectStore.delete(key);
  };

  const setData = async (data: T) => {
		if (value === null) {
			setValue(data);
		}
	
		if (databaseRef.current) {
			try {
				await setItem(databaseRef.current, key, data);
			} catch (error) {
				console.error('Error setting data in IndexedDB:', error);
			}
		} else {
			console.warn('Unable to set data in IndexedDB because the database connection is closed.');
		}
	};

  const removeData = async () => {
    if (databaseRef.current) {
      await removeItem(databaseRef.current, key);
      setValue(null);
    }
  };

  return [value, setData, removeData] as const;
};

export default useIndexDB;

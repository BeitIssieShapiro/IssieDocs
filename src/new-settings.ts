import { MMKV } from 'react-native-mmkv';
import { Platform, Settings as SettingIOS } from 'react-native';

const storage = new MMKV({
    id: 'IssieDocsStorage',
});;


type SupportedTypes = 'number' | 'boolean' | 'string';


class SettingsAndroid {
    // static getString(key: string, defValue: string): string {
    //     if (!storage) throw "Missing Storage"
    //     const val = storage.getString(key);
    //     if (!val) return defValue;
    //     return val;
    // }
    // static getNumber(key: string, defValue: number): number {
    //     if (!storage) throw "Missing Storage"
    //     const val = storage.getNumber(key);
    //     if (!val) return defValue;
    //     return val;
    // }
    // static getBoolean(key: string, defValue: boolean): boolean {
    //     if (!storage) throw "Missing Storage"
    //     const val = storage.getBoolean(key);
    //     if (!val) return defValue;
    //     return val;
    // }

    static get(key: string): any {
        const val = storage.getString(key); // Retrieve the stored value as a string
        //console.log("Settings.get", key, "=", val);
        try {
            // Attempt to parse JSON, fallback to raw value if not valid JSON
            return val ? JSON.parse(val) : null;
        } catch (error) {
            console.warn(`Settings.get: Failed to parse value for key "${key}"`, error);
            return val; // Return the raw value as a fallback
        }
    }

    static set(obj: any) {
        Object.entries(obj).forEach(([key, value]) => {
            SettingsAndroid.setValue(key, value);
        })
    }

    static setValue(key: string, val: any) {
        console.log("Settings.set", key, val);
        // Store as a JSON string
        storage.set(key, JSON.stringify(val));
    }


    // static setArray(key: string, arr: any[]) {
    //     storage.set(key, arr.length);
    //     for (let i = 0; i < arr.length; i++) {
    //         storage.set(key + "_" + i, arr[i]);
    //     }
    // }

    /**
     * Retrieves an array of values from storage based on the specified type.
     *
     * @param key - The base key used to store the array count and individual items.
     * @param defValue - The default array to return if stored values are missing.
     * @param type - The type of the items stored ('number', 'boolean', or 'string').
     * @returns An array of type T or undefined if the count is not set.
     */
    // static getArray<T>(key: string, type: SupportedTypes, defValue: T[]): T[] {
    //     if (!storage) throw "Missing Storage"
    //     const count = storage.getNumber(key);
    //     if (count !== undefined && count > 0) {
    //         const retValue: T[] = [];
    //         for (let i = 0; i < count; i++) {
    //             let val: T | undefined;
    //             const itemKey = `${key}_${i}`;

    //             switch (type) {
    //                 case 'number':
    //                     val = storage.getNumber(itemKey) as unknown as T;
    //                     break;
    //                 case 'boolean':
    //                     val = storage.getBoolean(itemKey) as unknown as T;
    //                     break;
    //                 case 'string':
    //                     val = storage.getString(itemKey) as unknown as T;
    //                     break;
    //                 default:
    //                     throw new Error(`Unsupported type: ${type}`);
    //             }

    //             if (val === undefined && i < defValue.length) {
    //                 val = defValue[i];
    //             }

    //             retValue.push(val);
    //         }
    //         return retValue;
    //     }
    //     return defValue;
    // }
}

let Settings = Platform.OS == 'android' ? SettingsAndroid : SettingIOS;
exports.Settings = Settings;
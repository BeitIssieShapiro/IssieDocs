/**
 * In-memory react-native-mmkv for Jest, shared by the Issie apps.
 *
 * Covers both APIs in use: v3 (`new MMKV({id})`, IssieSays) and v4
 * (`createMMKV({id})`, IssieDice/IssieDocs). Like the native module, set()
 * throws on anything that is not a boolean, number, string or ArrayBuffer, so a
 * test catches code that tries to store an object or an array directly.
 *
 * Instances with the same id share their data, like on a device. Call
 * `__resetAll()` (exported) in beforeEach to start from an empty store.
 *
 *   jest.mock('react-native-mmkv', () => require('<path>/testing/jest/mmkv'));
 */
const stores = new Map();

function storeFor(id) {
    if (!stores.has(id)) stores.set(id, new Map());
    return stores.get(id);
}

class MMKV {
    constructor(config = {}) {
        this.id = config.id || 'mmkv.default';
        this.map = storeFor(this.id);
    }
    set(key, value) {
        const t = typeof value;
        if (!(t === 'boolean' || t === 'number' || t === 'string' || value instanceof ArrayBuffer)) {
            throw new Error("MMKV::set: 'value' argument is not of type bool, number, string or buffer!");
        }
        this.map.set(key, value);
    }
    getString(key) { const v = this.map.get(key); return typeof v === 'string' ? v : undefined; }
    getNumber(key) { const v = this.map.get(key); return typeof v === 'number' ? v : undefined; }
    getBoolean(key) { const v = this.map.get(key); return typeof v === 'boolean' ? v : undefined; }
    getBuffer(key) { const v = this.map.get(key); return v instanceof ArrayBuffer ? v : undefined; }
    contains(key) { return this.map.has(key); }
    delete(key) { this.map.delete(key); }   // v3
    remove(key) { return this.map.delete(key); } // v4
    getAllKeys() { return [...this.map.keys()]; }
    clearAll() { this.map.clear(); }
    get size() { return this.map.size; }
    addOnValueChangedListener() { return { remove() { } }; }
}

module.exports = {
    __esModule: true,
    MMKV,
    createMMKV: (config) => new MMKV(config),
    useMMKVString: () => [undefined, () => { }],
    useMMKVNumber: () => [undefined, () => { }],
    useMMKVBoolean: () => [undefined, () => { }],
    /** Empties every store. */
    __resetAll: () => stores.forEach(m => m.clear()),
    /** The raw Map of a store, for seeding or inspecting in a test. */
    __store: storeFor,
};

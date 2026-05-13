// ==================== INDEXEDDB DATABASE ====================
// En fullverdig database inne i nettleseren som lagrer data for alle brukere

const DB_NAME = 'WorkBenchProDB';
const DB_VERSION = 1;

// Initialiser databasen
function initDatabase() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
        
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            
            // Tabell for brukere
            if (!db.objectStoreNames.contains('users')) {
                const userStore = db.createObjectStore('users', { keyPath: 'username' });
                userStore.createIndex('email', 'email', { unique: false });
            }
            
            // Tabell for timelogg
            if (!db.objectStoreNames.contains('timerLogg')) {
                const timerStore = db.createObjectStore('timerLogg', { keyPath: 'id', autoIncrement: true });
                timerStore.createIndex('username', 'username', { unique: false });
                timerStore.createIndex('dato', 'dato', { unique: false });
                timerStore.createIndex('username_dato', ['username', 'dato'], { unique: false });
            }
            
            // Tabell for fravær
            if (!db.objectStoreNames.contains('fravaer')) {
                const fravaerStore = db.createObjectStore('fravaer', { keyPath: 'id', autoIncrement: true });
                fravaerStore.createIndex('username', 'username', { unique: false });
                fravaerStore.createIndex('dato', 'dato', { unique: false });
            }
            
            // Tabell for lønninger (prosjektbasert)
            if (!db.objectStoreNames.contains('lonninger')) {
                const lonnStore = db.createObjectStore('lonninger', { keyPath: 'id', autoIncrement: true });
                lonnStore.createIndex('username', 'username', { unique: false });
                lonnStore.createIndex('prosjekt', 'prosjekt', { unique: false });
                lonnStore.createIndex('dato', 'dato', { unique: false });
                lonnStore.createIndex('username_prosjekt', ['username', 'prosjekt'], { unique: false });
            }
            
            // Tabell for lommebok transaksjoner
            if (!db.objectStoreNames.contains('walletTransaksjoner')) {
                const walletStore = db.createObjectStore('walletTransaksjoner', { keyPath: 'id', autoIncrement: true });
                walletStore.createIndex('username', 'username', { unique: false });
                walletStore.createIndex('dato', 'dato', { unique: false });
                walletStore.createIndex('type', 'type', { unique: false });
            }
            
            // Tabell for saldo per bruker
            if (!db.objectStoreNames.contains('saldo')) {
                const saldoStore = db.createObjectStore('saldo', { keyPath: 'username' });
            }
            
            // Tabell for arbeidslogg (med bilder)
            if (!db.objectStoreNames.contains('arbeidslogg')) {
                const loggStore = db.createObjectStore('arbeidslogg', { keyPath: 'id', autoIncrement: true });
                loggStore.createIndex('username', 'username', { unique: false });
                loggStore.createIndex('dato', 'dato', { unique: false });
            }
            
            // Tabell for timelønn per økt (detaljert)
            if (!db.objectStoreNames.contains('timelonnPerOkt')) {
                const timelonnStore = db.createObjectStore('timelonnPerOkt', { keyPath: 'id', autoIncrement: true });
                timelonnStore.createIndex('username', 'username', { unique: false });
                timelonnStore.createIndex('øktId', 'øktId', { unique: false });
                timelonnStore.createIndex('prosjekt', 'prosjekt', { unique: false });
            }
        };
    });
}

// Hjelpefunksjon for å utføre operasjoner på databasen
async function executeDB(storeName, mode, callback) {
    const db = await initDatabase();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], mode);
        const store = transaction.objectStore(storeName);
        
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
        
        callback(store, resolve, reject);
    });
}

// ==================== BRUKERFUNKSJONER ====================

// Registrer ny bruker
async function registerUserDB(username, password, email) {
    const users = await getAllUsersDB();
    if (users[username]) {
        return { success: false, message: 'Brukernavn er allerede tatt' };
    }
    
    if (!username.trim() || !password.trim()) {
        return { success: false, message: 'Fyll ut alle felt' };
    }
    
    // Lagre bruker
    await executeDB('users', 'readwrite', (store, resolve) => {
        const request = store.put({
            username: username,
            password: password,
            email: email || '',
            created: new Date().toISOString()
        });
        request.onsuccess = () => resolve();
    });
    
    // Opprett startsaldo for brukeren
    await executeDB('saldo', 'readwrite', (store, resolve) => {
        const request = store.put({ username: username, belop: 0 });
        request.onsuccess = () => resolve();
    });
    
    return { success: true, message: 'Bruker opprettet!' };
}

// Hent alle brukere
async function getAllUsersDB() {
    const db = await initDatabase();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['users'], 'readonly');
        const store = transaction.objectStore('users');
        const request = store.getAll();
        
        request.onsuccess = () => {
            const users = {};
            request.result.forEach(user => {
                users[user.username] = user;
            });
            resolve(users);
        };
        request.onerror = () => reject(request.error);
    });
}

// Logg inn bruker
async function loginUserDB(username, password) {
    const db = await initDatabase();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['users'], 'readonly');
        const store = transaction.objectStore('users');
        const request = store.get(username);
        
        request.onsuccess = () => {
            const user = request.result;
            if (!user) {
                resolve({ success: false, message: 'Bruker finnes ikke' });
            } else if (user.password !== password) {
                resolve({ success: false, message: 'Feil passord' });
            } else {
                // Lagre innlogget bruker i sessionStorage
                sessionStorage.setItem('workbench_currentUser', username);
                resolve({ success: true, message: 'Innlogging vellykket', username: username });
            }
        };
        request.onerror = () => reject(request.error);
    });
}

// ==================== TIMERLOGG FUNKSJONER ====================

async function getTimerLoggDB(username) {
    const db = await initDatabase();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['timerLogg'], 'readonly');
        const store = transaction.objectStore('timerLogg');
        const index = store.index('username');
        const request = index.getAll(username);
        
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
    });
}

async function addTimerLoggDB(logg) {
    await executeDB('timerLogg', 'readwrite', (store, resolve) => {
        const request = store.add(logg);
        request.onsuccess = () => resolve();
    });
}

async function deleteTimerLoggDB(id) {
    await executeDB('timerLogg', 'readwrite', (store, resolve) => {
        const request = store.delete(id);
        request.onsuccess = () => resolve();
    });
}

// ==================== FRAVÆR FUNKSJONER ====================

async function getFravaerDB(username) {
    const db = await initDatabase();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['fravaer'], 'readonly');
        const store = transaction.objectStore('fravaer');
        const index = store.index('username');
        const request = index.getAll(username);
        
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
    });
}

async function addFravaerDB(fravaer) {
    await executeDB('fravaer', 'readwrite', (store, resolve) => {
        const request = store.add(fravaer);
        request.onsuccess = () => resolve();
    });
}

async function deleteFravaerDB(id) {
    await executeDB('fravaer', 'readwrite', (store, resolve) => {
        const request = store.delete(id);
        request.onsuccess = () => resolve();
    });
}

// ==================== LØNNINGER FUNKSJONER ====================

async function getLonningerDB(username) {
    const db = await initDatabase();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['lonninger'], 'readonly');
        const store = transaction.objectStore('lonninger');
        const index = store.index('username');
        const request = index.getAll(username);
        
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
    });
}

async function addLonningDB(lonning) {
    await executeDB('lonninger', 'readwrite', (store, resolve) => {
        const request = store.add(lonning);
        request.onsuccess = () => resolve();
    });
}

async function updateLonningDB(id, oppdatertLonning) {
    const db = await initDatabase();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['lonninger'], 'readwrite');
        const store = transaction.objectStore('lonninger');
        const request = store.put({ ...oppdatertLonning, id: id });
        
        request.onsuccess = () => resolve(true);
        request.onerror = () => reject(request.error);
    });
}

async function deleteLonningDB(id) {
    await executeDB('lonninger', 'readwrite', (store, resolve) => {
        const request = store.delete(id);
        request.onsuccess = () => resolve();
    });
}

// ==================== LOMMEBOK FUNKSJONER ====================

async function getWalletTransaksjonerDB(username) {
    const db = await initDatabase();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['walletTransaksjoner'], 'readonly');
        const store = transaction.objectStore('walletTransaksjoner');
        const index = store.index('username');
        const request = index.getAll(username);
        
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
    });
}

async function addWalletTransaksjonDB(transaksjon) {
    await executeDB('walletTransaksjoner', 'readwrite', (store, resolve) => {
        const request = store.add(transaksjon);
        request.onsuccess = () => resolve();
    });
}

async function deleteWalletTransaksjonDB(id) {
    await executeDB('walletTransaksjoner', 'readwrite', (store, resolve) => {
        const request = store.delete(id);
        request.onsuccess = () => resolve();
    });
}

// ==================== SALDO FUNKSJONER ====================

async function getSaldoDB(username) {
    const db = await initDatabase();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['saldo'], 'readonly');
        const store = transaction.objectStore('saldo');
        const request = store.get(username);
        
        request.onsuccess = () => resolve(request.result?.belop || 0);
        request.onerror = () => reject(request.error);
    });
}

async function updateSaldoDB(username, nyttBelop) {
    await executeDB('saldo', 'readwrite', (store, resolve) => {
        const request = store.put({ username: username, belop: nyttBelop });
        request.onsuccess = () => resolve();
    });
}

// ==================== ARBEIDSLOGG FUNKSJONER ====================

async function getArbeidsloggDB(username) {
    const db = await initDatabase();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['arbeidslogg'], 'readonly');
        const store = transaction.objectStore('arbeidslogg');
        const index = store.index('username');
        const request = index.getAll(username);
        
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
    });
}

async function addArbeidsloggDB(logg) {
    await executeDB('arbeidslogg', 'readwrite', (store, resolve) => {
        const request = store.add(logg);
        request.onsuccess = () => resolve();
    });
}

async function deleteArbeidsloggDB(id) {
    await executeDB('arbeidslogg', 'readwrite', (store, resolve) => {
        const request = store.delete(id);
        request.onsuccess = () => resolve();
    });
}

// ==================== TIMELØNN PER ØKT (spesifikk for lonn.html) ====================

async function getTimelonnPerOktDB(username) {
    const db = await initDatabase();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['timelonnPerOkt'], 'readonly');
        const store = transaction.objectStore('timelonnPerOkt');
        const index = store.index('username');
        const request = index.getAll(username);
        
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
    });
}

async function addTimelonnPerOktDB(data) {
    await executeDB('timelonnPerOkt', 'readwrite', (store, resolve) => {
        const request = store.add(data);
        request.onsuccess = () => resolve();
    });
}

async function updateTimelonnPerOktDB(id, oppdatertData) {
    const db = await initDatabase();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['timelonnPerOkt'], 'readwrite');
        const store = transaction.objectStore('timelonnPerOkt');
        const request = store.put({ ...oppdatertData, id: id });
        
        request.onsuccess = () => resolve(true);
        request.onerror = () => reject(request.error);
    });
}

async function deleteTimelonnPerOktDB(id) {
    await executeDB('timelonnPerOkt', 'readwrite', (store, resolve) => {
        const request = store.delete(id);
        request.onsuccess = () => resolve();
    });
}

// Eksporter data til JSON (backup)
async function exportAllDataDB(username) {
    const [timerLogg, fravaer, lonninger, wallet, arbeidslogg, timelonnPerOkt, saldo] = await Promise.all([
        getTimerLoggDB(username),
        getFravaerDB(username),
        getLonningerDB(username),
        getWalletTransaksjonerDB(username),
        getArbeidsloggDB(username),
        getTimelonnPerOktDB(username),
        getSaldoDB(username)
    ]);
    
    return {
        username,
        timerLogg,
        fravaer,
        lonninger,
        walletTransaksjoner: wallet,
        arbeidslogg,
        timelonnPerOkt,
        saldo,
        eksportDato: new Date().toISOString()
    };
}

// Importer data fra JSON
async function importAllDataDB(username, data) {
    // Slett eksisterende data for brukeren
    const allTimer = await getTimerLoggDB(username);
    for (const t of allTimer) await deleteTimerLoggDB(t.id);
    
    const allFravaer = await getFravaerDB(username);
    for (const f of allFravaer) await deleteFravaerDB(f.id);
    
    const allLonninger = await getLonningerDB(username);
    for (const l of allLonninger) await deleteLonningDB(l.id);
    
    const allWallet = await getWalletTransaksjonerDB(username);
    for (const w of allWallet) await deleteWalletTransaksjonDB(w.id);
    
    const allArbeidslogg = await getArbeidsloggDB(username);
    for (const a of allArbeidslogg) await deleteArbeidsloggDB(a.id);
    
    const allTimelonn = await getTimelonnPerOktDB(username);
    for (const t of allTimelonn) await deleteTimelonnPerOktDB(t.id);
    
    // Importer nye data
    if (data.timerLogg) for (const t of data.timerLogg) await addTimerLoggDB(t);
    if (data.fravaer) for (const f of data.fravaer) await addFravaerDB(f);
    if (data.lonninger) for (const l of data.lonninger) await addLonningDB(l);
    if (data.walletTransaksjoner) for (const w of data.walletTransaksjoner) await addWalletTransaksjonDB(w);
    if (data.arbeidslogg) for (const a of data.arbeidslogg) await addArbeidsloggDB(a);
    if (data.timelonnPerOkt) for (const t of data.timelonnPerOkt) await addTimelonnPerOktDB(t);
    if (data.saldo !== undefined) await updateSaldoDB(username, data.saldo);
    
    return true;
}
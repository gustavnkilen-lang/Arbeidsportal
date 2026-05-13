// ==================== DATALAGRING (localStorage) ====================
// Dette er den sentrale datakilden for hele applikasjonen

// Standard tom datastruktur
function getDefaultWorkData() {
    return {
        timerLogg: [],
        fravær: [],
        månedslønn: [],
        walletHistory: [],
        saldo: 0
    };
}

// Hent arbeidsdata for innlogget bruker
function loadWorkData() {
    const currentUser = sessionStorage.getItem('workbench_currentUser');
    if (!currentUser) return null;
    const raw = localStorage.getItem(`workbench_${currentUser}`);
    if (raw) {
        const data = JSON.parse(raw);
        if (!data.walletHistory) data.walletHistory = [];
        if (data.saldo === undefined) data.saldo = 0;
        if (!data.timerLogg) data.timerLogg = [];
        if (!data.fravær) data.fravær = [];
        if (!data.månedslønn) data.månedslønn = [];
        return data;
    }
    return getDefaultWorkData();
}

// Lagre arbeidsdata
function saveWorkData(data) {
    const currentUser = sessionStorage.getItem('workbench_currentUser');
    if (currentUser) {
        localStorage.setItem(`workbench_${currentUser}`, JSON.stringify(data));
    }
}

// Hent alle brukere
function getUsers() {
    const raw = localStorage.getItem('workbench_users');
    return raw ? JSON.parse(raw) : {};
}

// Lagre alle brukere
function saveUsers(users) {
    localStorage.setItem('workbench_users', JSON.stringify(users));
}

// Beregn timer mellom to klokkeslett
function beregnTimer(startStr, sluttStr) {
    if (!startStr || !sluttStr) return 0;
    const [startH, startM] = startStr.split(':').map(Number);
    const [sluttH, sluttM] = sluttStr.split(':').map(Number);
    let timer = (sluttH + sluttM/60) - (startH + startM/60);
    if (timer < 0) timer += 24;
    return parseFloat(timer.toFixed(2));
}

// Formater tall til NOK
function formatNOK(verdi) {
    return verdi.toLocaleString('nb-NO') + ' kr';
}

// Oppdater KPI-visning (henter statistikk)
function updateKPICards(data) {
    const totalInntekt = (data.månedslønn || []).reduce((sum, m) => sum + (m.beløp || 0), 0);
    const totalUtgift = (data.walletHistory || []).filter(w => w.type === 'utgift').reduce((sum, w) => sum + w.belop, 0);
    const totaleTimer = (data.timerLogg || []).reduce((sum, t) => sum + t.totalTimer, 0);
    
    return { totalInntekt, totalUtgift, totaleTimer, saldo: data.saldo || 0 };
}
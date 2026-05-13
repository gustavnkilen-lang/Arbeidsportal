// ==================== DASHBOARD LOGIKK ====================

let currentData = null;

// Initialiser dashboard
function initDashboard() {
    if (!isLoggedIn()) {
        window.location.href = 'index.html';
        return;
    }
    
    // Sett brukernavn i header
    document.getElementById('currentUserDisplay').innerText = getCurrentUser();
    
    // Sett dagens dato i inputfelter
    const today = new Date().toISOString().slice(0, 10);
    const timerDato = document.getElementById('timerDato');
    const fravDato = document.getElementById('fravDato');
    const transDato = document.getElementById('transDato');
    const lonnMaaned = document.getElementById('lonnMaaned');
    
    if (timerDato) timerDato.value = today;
    if (fravDato) fravDato.value = today;
    if (transDato) transDato.value = today;
    if (lonnMaaned) lonnMaaned.value = new Date().toISOString().slice(0, 7);
    
    // Last data og oppdater alle visninger
    refreshAllData();
    
    // Sett opp event listeners
    setupEventListeners();
    setupTabNavigation();
}

// Oppdater all data fra localStorage og re-render
function refreshAllData() {
    currentData = loadWorkData();
    if (!currentData) {
        currentData = getDefaultWorkData();
        saveWorkData(currentData);
    }
    
    updateKPIs();
    updateTimerTable();
    updateFraværTable();
    updateLonnTable();
    updateWalletTable();
    updateAggregering();
    updateStats();
}

// Oppdater KPI-kort
function updateKPIs() {
    const stats = updateKPICards(currentData);
    const kpiGrid = document.getElementById('kpiGrid');
    
    kpiGrid.innerHTML = `
        <div class="kpi-card">
            <div class="kpi-label">NÅVÆRENDE SALDO</div>
            <div class="kpi-value ${stats.saldo >= 0 ? 'positive' : 'negative'}">${formatNOK(stats.saldo)}</div>
            <div class="kpi-sub">Lommebok / kontanter</div>
        </div>
        <div class="kpi-card">
            <div class="kpi-label">TOTAL LØNN (REG.)</div>
            <div class="kpi-value positive">${formatNOK(stats.totalInntekt)}</div>
            <div class="kpi-sub">fra ${currentData.månedslønn.length} måneder</div>
        </div>
        <div class="kpi-card">
            <div class="kpi-label">TOTAL UTGIFTER</div>
            <div class="kpi-value negative">- ${formatNOK(stats.totalUtgift)}</div>
            <div class="kpi-sub">historiske utgifter</div>
        </div>
        <div class="kpi-card">
            <div class="kpi-label">ARBEIDSTIMER (TOT)</div>
            <div class="kpi-value">${stats.totaleTimer.toFixed(1)} h</div>
            <div class="kpi-sub">registrerte timer</div>
        </div>
    `;
}

// Oppdater timelogg-tabell
function updateTimerTable() {
    const tbody = document.getElementById('timerTableBody');
    if (!tbody) return;
    
    const sorted = [...(currentData.timerLogg || [])].sort((a, b) => b.dato.localeCompare(a.dato));
    tbody.innerHTML = sorted.map(t => `
        <tr>
            <td>${t.dato}</td>
            <td>${t.startKl}</td>
            <td>${t.sluttKl}</td>
            <td>${t.totalTimer}</td>
            <td>${t.beskrivelse || '-'}</td>
            <td><button class="action-btn delete-timer" data-id="${t.id}">Slett</button></td>
        </tr>
    `).join('');
    
    // Legg til slett-lyttere
    document.querySelectorAll('.delete-timer').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = parseFloat(btn.getAttribute('data-id'));
            currentData.timerLogg = currentData.timerLogg.filter(t => t.id !== id);
            saveWorkData(currentData);
            refreshAllData();
        });
    });
}

// Oppdater fravær-tabell
function updateFraværTable() {
    const tbody = document.getElementById('fraværTableBody');
    if (!tbody) return;
    
    const sorted = [...(currentData.fravær || [])].sort((a, b) => b.dato.localeCompare(a.dato));
    tbody.innerHTML = sorted.map(f => `
        <tr>
            <td>${f.dato}</td>
            <td>${f.timerFravær}</td>
            <td>${f.årsak}</td>
            <td><button class="action-btn delete-fravær" data-id="${f.id}">Slett</button></td>
        </tr>
    `).join('');
    
    document.querySelectorAll('.delete-fravær').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = parseFloat(btn.getAttribute('data-id'));
            currentData.fravær = currentData.fravær.filter(f => f.id !== id);
            saveWorkData(currentData);
            refreshAllData();
        });
    });
}

// Oppdater lønnstabell
function updateLonnTable() {
    const tbody = document.getElementById('lonnTableBody');
    if (!tbody) return;
    
    const sorted = [...(currentData.månedslønn || [])].sort((a, b) => b.måned.localeCompare(a.måned));
    tbody.innerHTML = sorted.map(l => `
        <tr>
            <td>${l.måned}</td>
            <td>${formatNOK(l.beløp)}</td>
            <td>${l.kommentar || '-'}</td>
            <td><button class="action-btn delete-lonn" data-month="${l.måned}">Slett</button></td>
        </tr>
    `).join('');
    
    document.querySelectorAll('.delete-lonn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const month = btn.getAttribute('data-month');
            currentData.månedslønn = currentData.månedslønn.filter(m => m.måned !== month);
            saveWorkData(currentData);
            refreshAllData();
        });
    });
}

// Oppdater lommebok-tabell
function updateWalletTable() {
    const tbody = document.getElementById('walletTableBody');
    if (!tbody) return;
    
    const sorted = [...(currentData.walletHistory || [])].sort((a, b) => b.dato.localeCompare(a.dato));
    tbody.innerHTML = sorted.map(w => `
        <tr>
            <td>${w.dato}</td>
            <td>${w.beskrivelse} ${w.type === 'utgift' ? '(utgift)' : '(inntekt)'}</td>
            <td style="${w.type === 'utgift' ? 'color:#f87171' : 'color:#4ade80'}">${w.type === 'utgift' ? '-' : '+'} ${formatNOK(w.belop)}</td>
            <td><button class="action-btn delete-trans" data-id="${w.id}">Slett</button></td>
        </tr>
    `).join('');
    
    document.querySelectorAll('.delete-trans').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = parseFloat(btn.getAttribute('data-id'));
            const trans = currentData.walletHistory.find(t => t.id === id);
            if (trans) {
                if (trans.type === 'utgift') currentData.saldo += trans.belop;
                else currentData.saldo -= trans.belop;
                currentData.walletHistory = currentData.walletHistory.filter(t => t.id !== id);
                saveWorkData(currentData);
                refreshAllData();
            }
        });
    });
}

// Aggregering av timer per måned
function updateAggregering() {
    const container = document.getElementById('aggregeringContainer');
    if (!container) return;
    
    const byMonth = {};
    (currentData.timerLogg || []).forEach(t => {
        const month = t.dato.slice(0, 7);
        byMonth[month] = (byMonth[month] || 0) + t.totalTimer;
    });
    
    if (Object.keys(byMonth).length === 0) {
        container.innerHTML = '<div class="stat-card">Ingen timer registrert enda</div>';
    } else {
        container.innerHTML = Object.entries(byMonth).sort().map(([m, h]) => 
            `<div class="stat-card"><div class="stat-number">${h.toFixed(1)} h</div><div class="stat-label">${m}</div></div>`
        ).join('');
    }
}

// Statistikk
function updateStats() {
    const container = document.getElementById('statsContainer');
    if (!container) return;
    
    const totalTimer = currentData.timerLogg.reduce((s, t) => s + t.totalTimer, 0);
    const totalFravær = currentData.fravær.reduce((s, f) => s + f.timerFravær, 0);
    const snittLonn = currentData.månedslønn.length ? currentData.månedslønn.reduce((s, l) => s + l.beløp, 0) / currentData.månedslønn.length : 0;
    
    container.innerHTML = `
        <div class="stat-card"><div class="stat-number">${totalTimer.toFixed(1)}</div><div class="stat-label">Totalt timer jobbet</div></div>
        <div class="stat-card"><div class="stat-number">${totalFravær.toFixed(1)}</div><div class="stat-label">Totalt fravær (timer)</div></div>
        <div class="stat-card"><div class="stat-number">${formatNOK(snittLonn)}</div><div class="stat-label">Gjennomsnittlig månedslønn</div></div>
        <div class="stat-card"><div class="stat-number">${currentData.walletHistory.length}</div><div class="stat-label">Antall transaksjoner</div></div>
    `;
}

// Sett opp alle knappelyttere
function setupEventListeners() {
    // Legg til timer
    const leggTimerBtn = document.getElementById('leggTilTimerBtn');
    if (leggTimerBtn) {
        leggTimerBtn.addEventListener('click', () => {
            const dato = document.getElementById('timerDato').value;
            const start = document.getElementById('startTid').value;
            const slutt = document.getElementById('sluttTid').value;
            const beskrivelse = document.getElementById('timerBeskrivelse').value || "Arbeid";
            
            if (!dato || !start || !slutt) {
                alert("Fyll ut dato og klokkeslett");
                return;
            }
            const timer = beregnTimer(start, slutt);
            if (timer <= 0) {
                alert("Sluttid må være etter starttid");
                return;
            }
            
            currentData.timerLogg.push({
                id: Date.now(),
                dato: dato,
                startKl: start,
                sluttKl: slutt,
                totalTimer: timer,
                beskrivelse: beskrivelse
            });
            saveWorkData(currentData);
            refreshAllData();
        });
    }
    
    // Legg til fravær
    const leggFraværBtn = document.getElementById('leggFraværBtn');
    if (leggFraværBtn) {
        leggFraværBtn.addEventListener('click', () => {
            const dato = document.getElementById('fravDato').value;
            const timer = parseFloat(document.getElementById('fravTimer').value);
            const arsak = document.getElementById('fravArsak').value || "Ikke oppgitt";
            
            if (!dato || isNaN(timer) || timer <= 0) {
                alert("Fyll ut gyldig dato og timer");
                return;
            }
            
            currentData.fravær.push({
                id: Date.now(),
                dato: dato,
                timerFravær: timer,
                årsak: arsak
            });
            saveWorkData(currentData);
            refreshAllData();
        });
    }
    
    // Registrer lønn
    const regLonnBtn = document.getElementById('regLonnBtn');
    if (regLonnBtn) {
        regLonnBtn.addEventListener('click', () => {
            const måned = document.getElementById('lonnMaaned').value;
            const beløp = parseFloat(document.getElementById('lonnBelop').value);
            const kommentar = document.getElementById('lonnKommentar').value || "";
            
            if (!måned || isNaN(beløp) || beløp <= 0) {
                alert("Fyll ut måned og gyldig beløp");
                return;
            }
            
            const existing = currentData.månedslønn.findIndex(m => m.måned === måned);
            if (existing !== -1) {
                currentData.månedslønn[existing] = { måned, beløp, kommentar };
            } else {
                currentData.månedslønn.push({ måned, beløp, kommentar });
            }
            saveWorkData(currentData);
            refreshAllData();
        });
    }
    
    // Overfør lønn til lommebok
    const overforBtn = document.getElementById('overforTilLommebokBtn');
    if (overforBtn) {
        overforBtn.addEventListener('click', () => {
            const måned = document.getElementById('lonnMaaned').value;
            const lonnPost = currentData.månedslønn.find(m => m.måned === måned);
            if (!lonnPost) {
                alert("Registrer først lønn for denne måneden");
                return;
            }
            
            currentData.saldo = (currentData.saldo || 0) + lonnPost.beløp;
            currentData.walletHistory.push({
                id: Date.now(),
                dato: new Date().toISOString().slice(0, 10),
                beskrivelse: `Lønn ${måned}`,
                belop: lonnPost.beløp,
                type: "inntekt"
            });
            saveWorkData(currentData);
            refreshAllData();
        });
    }
    
    // Legg til transaksjon
    const leggTransBtn = document.getElementById('leggTilTransaksjonBtn');
    if (leggTransBtn) {
        leggTransBtn.addEventListener('click', () => {
            const beskrivelse = document.getElementById('transBeskrivelse').value;
            const belop = parseFloat(document.getElementById('transBelop').value);
            const type = document.getElementById('transType').value;
            const dato = document.getElementById('transDato').value;
            
            if (!beskrivelse || isNaN(belop) || belop <= 0) {
                alert("Fyll ut beskrivelse og gyldig beløp");
                return;
            }
            
            const endring = type === 'utgift' ? -belop : belop;
            currentData.saldo = (currentData.saldo || 0) + endring;
            currentData.walletHistory.push({
                id: Date.now(),
                dato: dato,
                beskrivelse: beskrivelse,
                belop: belop,
                type: type
            });
            saveWorkData(currentData);
            refreshAllData();
        });
    }
    
    // Logg ut
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            logoutUser();
        });
    }
    
    // Eksporter data
    const exportBtn = document.getElementById('exportDataBtn');
    if (exportBtn) {
        exportBtn.addEventListener('click', () => {
            const exportObj = {
                user: getCurrentUser(),
                eksportDato: new Date().toISOString(),
                data: currentData
            };
            const blob = new Blob([JSON.stringify(exportObj, null, 2)], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `workbench_${getCurrentUser()}_${new Date().toISOString().slice(0, 19)}.json`;
            a.click();
            URL.revokeObjectURL(url);
        });
    }
    
    // Importer data
    const importFile = document.getElementById('importFile');
    if (importFile) {
        importFile.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (ev) => {
                try {
                    const imported = JSON.parse(ev.target.result);
                    if (imported.data && (imported.data.timerLogg || imported.data.fravær)) {
                        saveWorkData(imported.data);
                        refreshAllData();
                        alert("Data gjenopprettet fra backup!");
                    } else {
                        alert("Ugyldig backup-format");
                    }
                } catch (err) {
                    alert("Feil ved parsing: " + err.message);
                }
            };
            reader.readAsText(file);
            importFile.value = '';
        });
    }
    
    // Tilbakestill all data
    const resetBtn = document.getElementById('resetAllDataBtn');
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            if (confirm("ADVARSEL: Dette sletter ALLE dine timer, fravær, lønn og transaksjoner. Kan ikke angres!")) {
                saveWorkData(getDefaultWorkData());
                refreshAllData();
            }
        });
    }
}

// Tab-navigasjon
function setupTabNavigation() {
    const tabs = document.querySelectorAll('.tab-pro');
    const panes = ['tabTimereg', 'tabFravær', 'tabLonn', 'tabLommebok', 'tabAnalyse'];
    
    tabs.forEach((tab, index) => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            panes.forEach(pane => {
                const el = document.getElementById(pane);
                if (el) el.classList.remove('active-pane');
            });
            const activePane = document.getElementById(panes[index]);
            if (activePane) activePane.classList.add('active-pane');
        });
    });
}

// Start dashboard når siden er lastet
document.addEventListener('DOMContentLoaded', () => {
    initDashboard();
});
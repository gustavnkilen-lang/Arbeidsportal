// ==================== BRUKERADMINISTRASJON ====================
// Koblet sammen med data.js og dashboard.html

// Registrer ny bruker
function registerUser(username, password, confirmPassword) {
    if (!username.trim()) return { success: false, message: 'Brukernavn kan ikke være tomt' };
    if (!password) return { success: false, message: 'Passord kan ikke være tomt' };
    if (password !== confirmPassword) return { success: false, message: 'Passordene er ikke like' };
    
    const users = getUsers();
    if (users[username]) {
        return { success: false, message: 'Brukernavn er allerede tatt' };
    }
    
    users[username] = { password: password, created: new Date().toISOString() };
    saveUsers(users);
    
    // Opprett tom arbeidsdata for ny bruker
    localStorage.setItem(`workbench_${username}`, JSON.stringify(getDefaultWorkData()));
    
    return { success: true, message: 'Bruker opprettet! Du kan nå logge inn.' };
}

// Logg inn bruker
function loginUser(username, password) {
    const users = getUsers();
    if (!users[username]) {
        return { success: false, message: 'Brukernavn finnes ikke' };
    }
    if (users[username].password !== password) {
        return { success: false, message: 'Feil passord' };
    }
    
    // Lagre innlogget bruker i sessionStorage
    sessionStorage.setItem('workbench_currentUser', username);
    return { success: true, message: 'Innlogging vellykket' };
}

// Logg ut
function logoutUser() {
    sessionStorage.removeItem('workbench_currentUser');
    window.location.href = 'index.html';
}

// Sjekk om bruker er innlogget
function isLoggedIn() {
    return sessionStorage.getItem('workbench_currentUser') !== null;
}

// Hent innlogget brukernavn
function getCurrentUser() {
    return sessionStorage.getItem('workbench_currentUser');
}

// -------------------- EVENT LISTENERS --------------------
document.addEventListener('DOMContentLoaded', () => {
    // LOGIN (bare på index.html)
    const loginBtn = document.getElementById('loginBtn');
    if (loginBtn) {
        loginBtn.addEventListener('click', () => {
            const username = document.getElementById('loginUsername').value.trim();
            const password = document.getElementById('loginPassword').value;
            const result = loginUser(username, password);
            const msgDiv = document.getElementById('authMessage');
            
            if (result.success) {
                window.location.href = 'dashboard.html';
            } else {
                msgDiv.innerHTML = `<div style="background:#450a0a; padding:12px; border-radius:16px; color:#f87171; border:1px solid #7f1d1d;">${result.message}</div>`;
            }
        });
        
        // Enter key på login
        const loginPass = document.getElementById('loginPassword');
        if (loginPass) {
            loginPass.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    document.getElementById('loginBtn').click();
                }
            });
        }
    }
    
    // REGISTER (bare på index.html)
    const registerBtn = document.getElementById('registerBtn');
    if (registerBtn) {
        registerBtn.addEventListener('click', () => {
            const username = document.getElementById('regUsername').value.trim();
            const password = document.getElementById('regPassword').value;
            const confirm = document.getElementById('regPasswordConfirm').value;
            const result = registerUser(username, password, confirm);
            const msgDiv = document.getElementById('authMessage');
            
            if (result.success) {
                msgDiv.innerHTML = `<div style="background:#064e3b; padding:12px; border-radius:16px; color:#4ade80; border:1px solid #059669;">${result.message}</div>`;
                document.getElementById('regUsername').value = '';
                document.getElementById('regPassword').value = '';
                document.getElementById('regPasswordConfirm').value = '';
                // Fyll inn loginfelter for enkelhet
                document.getElementById('loginUsername').value = username;
                document.getElementById('loginPassword').value = '';
            } else {
                msgDiv.innerHTML = `<div style="background:#450a0a; padding:12px; border-radius:16px; color:#f87171; border:1px solid #7f1d1d;">${result.message}</div>`;
            }
        });
    }
    
    // SJEKK OM BRUKER ER ALLEREDE INNLOGGET
    // Hvis på index.html og allerede logget inn -> redirect til dashboard
    if (window.location.pathname.includes('index.html') || window.location.pathname === '/' || window.location.pathname.endsWith('/')) {
        if (isLoggedIn()) {
            window.location.href = 'dashboard.html';
        }
    }
    
    // Hvis på dashboard.html og IKKE logget inn -> redirect til index
    if (window.location.pathname.includes('dashboard.html')) {
        if (!isLoggedIn()) {
            window.location.href = 'index.html';
        }
    }
});
document.addEventListener('DOMContentLoaded', () => {
    // Nahraďte svými údaji ze Supabase (Settings -> API)
    const SUPABASE_URL = 'YOUR_SUPABASE_URL';
    const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';
    
    // Inicializace Supabase klienta
    let supabase = null;
    try {
        supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    } catch (e) {
        console.warn("Supabase initialization failed. Make sure to replace YOUR_SUPABASE_URL and YOUR_SUPABASE_ANON_KEY.");
    }

    const authForm = document.getElementById('auth-form');
    const authEmail = document.getElementById('auth-email');
    const authPassword = document.getElementById('auth-password');
    const authError = document.getElementById('auth-error');
    const registerBtn = document.getElementById('register-btn');

    // Sledování stavu přihlášení
    if (supabase) {
        supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
                if (session) {
                    // Přihlášený uživatel by měl být přesměrován na hlavní nástěnku
                    window.location.href = 'index.html';
                }
            }
        });
    }

    // Registrace
    registerBtn.addEventListener('click', async () => {
        authError.textContent = '';
        if (!supabase) {
            authError.textContent = 'Supabase není správně nastavené.';
            authError.style.color = '#e63946';
            return;
        }
        const email = authEmail.value;
        const password = authPassword.value;
        if (!email || !password) {
            authError.textContent = 'Vyplňte e-mail i heslo.';
            authError.style.color = '#e63946';
            return;
        }
        
        let finalEmail = email;
        let finalPassword = password;
        
        // Tajná zkratka pro admina (přemění "admin" na platný email pro Supabase)
        if (email.toLowerCase() === 'admin' && password === 'admin') {
            finalEmail = 'admin@nastenka.cz';
            finalPassword = 'adminpassword123';
        }
        
        const { data, error } = await supabase.auth.signUp({
            email: finalEmail,
            password: finalPassword,
        });

        if (error) {
            authError.textContent = error.message;
            authError.style.color = '#e63946';
        } else {
            authError.textContent = 'Registrace úspěšná. Nyní se můžete přihlásit.';
            authError.style.color = '#2a9d8f';
        }
    });

    // Přihlášení
    authForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        authError.textContent = '';
        authError.style.color = '#e63946';
        
        if (!supabase) {
            authError.textContent = 'Supabase není správně nastavené.';
            return;
        }

        const email = authEmail.value;
        const password = authPassword.value;
        
        let finalEmail = email;
        let finalPassword = password;
        
        // Tajná zkratka pro admina
        if (email.toLowerCase() === 'admin' && password === 'admin') {
            finalEmail = 'admin@nastenka.cz';
            finalPassword = 'adminpassword123';
        }
        
        const { data, error } = await supabase.auth.signInWithPassword({
            email: finalEmail,
            password: finalPassword,
        });

        if (error) {
            authError.textContent = 'Chyba přihlášení: Nesprávný e-mail nebo heslo.';
        } else {
            window.location.href = 'index.html';
        }
    });
});

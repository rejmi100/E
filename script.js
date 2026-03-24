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

    const taskForm = document.getElementById('task-form');
    const taskList = document.getElementById('task-list');
    
    // Header UI elementy
    const userInfo = document.getElementById('user-info');
    const userEmailSpan = document.getElementById('user-email');
    const logoutBtn = document.getElementById('logout-btn');
    const gotoLoginBtn = document.getElementById('goto-login-btn');
    const container = document.querySelector('.container');

    let tasks = [];
    let currentUser = null;

    if (gotoLoginBtn) {
        gotoLoginBtn.addEventListener('click', () => {
            window.location.href = 'login.html';
        });
    }

    // Sledování stavu přihlášení
    function updateAuthState(session) {
        if (session) {
            currentUser = session.user;
            userEmailSpan.textContent = currentUser.email;
            userInfo.style.display = 'flex';
            if (gotoLoginBtn) gotoLoginBtn.style.display = 'none';
            if (container) container.style.display = 'flex';
            loadTasks();
        } else {
            // Not authenticated
            currentUser = null;
            userInfo.style.display = 'none';
            if (gotoLoginBtn) gotoLoginBtn.style.display = 'block';
            if (container) container.style.display = 'none';
        }
    }

    if (supabase) {
        try {
            supabase.auth.getSession().then(({ data: { session } }) => {
                updateAuthState(session);
            }).catch(err => {
                console.error(err);
                updateAuthState(null);
            });

            supabase.auth.onAuthStateChange((event, session) => {
                if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
                    updateAuthState(session);
                }
            });
        } catch (e) {
            console.error("Supabase není správně nastavené. Chybí platná URL nebo klíč.", e);
            updateAuthState(null);
        }
    } else {
        updateAuthState(null);
    }

    // Odhlášení
    logoutBtn.addEventListener('click', async () => {
        if (supabase) await supabase.auth.signOut();
    });

    // Načtení úkolů ze Supabase
    async function loadTasks() {
        if (!currentUser) return;
        
        const { data, error } = await supabase
            .from('tasks')
            .select('*')
            .eq('user_id', currentUser.id);
            
        if (error) {
            console.error('Chyba při načítání úkolů:', error);
            return;
        }
        
        tasks = data || [];
        renderTasks();
    }

    // Helper pro XSS ochranu
    function escapeHTML(str) {
        if (!str) return '';
        return str.toString().replace(/[&<>'"]/g,
            tag => ({
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                "'": '&#39;',
                '"': '&quot;'
            }[tag] || tag)
        );
    }

    // Renderování seznamu úkolů
    function renderTasks() {
        taskList.innerHTML = '';

        if (tasks.length === 0) {
            taskList.innerHTML = `
                <div style="height: 100%; display: flex; align-items: center; justify-content: center; color: #666; font-size: 1.4rem; font-weight: 600; text-align: center;">
                    Zatím nemáš žádné úkoly.<br>Přidej úkol vlevo!
                </div>`;
            return;
        }

        // Nejprve nesplněné, poté dle data
        const sortedTasks = [...tasks].sort((a, b) => {
            if (a.completed !== b.completed) {
                return a.completed ? 1 : -1;
            }
            return b.createdAt - a.createdAt;
        });

        sortedTasks.forEach(task => {
            const taskEl = document.createElement('div');
            taskEl.className = `task-item ${task.completed ? 'completed' : ''}`;

            // Formatování data
            let formattedDate = '';
            try {
                const dateObj = new Date(task.date);
                if (!isNaN(dateObj)) {
                    formattedDate = dateObj.toLocaleDateString('cs-CZ', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric'
                    });
                }
            } catch (e) { }

            taskEl.innerHTML = `
                <div class="task-content">
                    <h3 class="task-title">${escapeHTML(task.name)}</h3>
                    <div class="task-meta">
                        ${task.subject ? `<span>${escapeHTML(task.subject)}</span>` : ''}
                        ${formattedDate ? `<span>TERMÍN: ${formattedDate}</span>` : ''}
                    </div>
                    ${task.desc ? `<div class="task-desc-text">${escapeHTML(task.desc)}</div>` : ''}
                </div>
                <div class="task-actions">
                    <label class="checkbox-wrapper" title="Označit jako hotové">
                        <input type="checkbox" onchange="toggleTask('${task.id}')" ${task.completed ? 'checked' : ''}>
                    </label>
                    <button type="button" class="delete-btn" onclick="deleteTask('${task.id}')" title="Smazat úkol">✖</button>
                </div>
            `;

            taskList.appendChild(taskEl);
        });
    }

    // Přidání nového úkolu
    taskForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        if (!currentUser) return;

        const nameInput = document.getElementById('task-name');
        const subjectInput = document.getElementById('task-subject');
        const dateInput = document.getElementById('task-date');
        const descInput = document.getElementById('task-desc');

        const newTask = {
            id: Date.now().toString(),
            user_id: currentUser.id,
            name: nameInput.value.trim(),
            subject: subjectInput.value,
            date: dateInput.value,
            desc: descInput.value.trim(),
            completed: false,
            createdAt: Date.now()
        };

        if (newTask.name !== '' && newTask.subject !== '' && newTask.date !== '') {
            // Optimistický update UI
            tasks.push(newTask);
            renderTasks();
            
            taskForm.reset();
            nameInput.focus();

            // Uložení do Supabase databáze
            const { error } = await supabase.from('tasks').insert([newTask]);
            if (error) {
                console.error('Chyba při ukládání úkolu:', error);
                alert('Nepodařilo se uložit úkol do databáze.');
                // Rollback if needed
                loadTasks();
            }
        } else {
            alert('Vyplňte prosím všechna povinná pole!');
        }
    });

    // Přepnutí hotovo/nehotovo
    window.toggleTask = async (id) => {
        if (!currentUser) return;
        
        const task = tasks.find(t => t.id === id);
        if (task) {
            task.completed = !task.completed;
            renderTasks(); // optimistický update

            const { error } = await supabase
                .from('tasks')
                .update({ completed: task.completed })
                .eq('id', id);

            if (error) {
                console.error('Chyba při aktualizaci úkolu:', error);
                task.completed = !task.completed; // rollback
                renderTasks();
                alert('Nepodařilo se aktualizovat stav úkolu.');
            }
        }
    };

    // Smazání úkolu
    window.deleteTask = async (id) => {
        if (!currentUser) return;
        
        if (confirm('Opravdu chcete tento úkol smazat?')) {
            const taskIndex = tasks.findIndex(t => t.id === id);
            if (taskIndex > -1) {
                const taskToDelete = tasks[taskIndex];
                tasks.splice(taskIndex, 1);
                renderTasks(); // optimistický update

                const { error } = await supabase
                    .from('tasks')
                    .delete()
                    .eq('id', id);

                if (error) {
                    console.error('Chyba při mazání úkolu:', error);
                    tasks.splice(taskIndex, 0, taskToDelete); // rollback
                    renderTasks();
                    alert('Nepodařilo se smazat úkol z databáze.');
                }
            }
        }
    };
});

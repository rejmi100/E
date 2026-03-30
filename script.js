document.addEventListener('DOMContentLoaded', () => {
    const taskForm = document.getElementById('task-form');
    const taskList = document.getElementById('task-list');

    // Nacteni ukolu z uloziste a vyčištění starých hotových úkolů
    let tasks = JSON.parse(localStorage.getItem('ok_nastenka_tasks')) || [];
    
    const ONE_DAY_MS = 24 * 60 * 60 * 1000;
    const now = Date.now();
    let tasksCleaned = false;

    tasks = tasks.filter(task => {
        if (task.completed) {
            if (!task.completedAt) {
                // Pro staré úkoly, kterým chybí záznam o čase dokončení
                task.completedAt = now;
                tasksCleaned = true;
            } else if (now - task.completedAt > ONE_DAY_MS) {
                tasksCleaned = true;
                return false; // odstranit
            }
        }
        return true;
    });

    if (tasksCleaned) {
        localStorage.setItem('ok_nastenka_tasks', JSON.stringify(tasks));
    }

    // Helper pro XSS ochranu
    function escapeHTML(str) {
        if (!str) return '';
        return str.replace(/[&<>'"]/g, 
            tag => ({
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                "'": '&#39;',
                '"': '&quot;'
            }[tag] || tag)
        );
    }

    // Renderování sezamu úkolů
    function renderTasks() {
        taskList.innerHTML = '';
        
        const noTasksMsg = document.getElementById('no-tasks-message');
        if (tasks.length === 0) {
            noTasksMsg.classList.remove('hidden');
            return;
        } else {
            noTasksMsg.classList.add('hidden');
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
            let isPastDue = false;
            try {
                const dateObj = new Date(task.date);
                if (!isNaN(dateObj)) {
                    formattedDate = dateObj.toLocaleDateString('cs-CZ', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric'
                    });
                    
                    if (!task.completed) {
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        const taskDateOnly = new Date(dateObj);
                        taskDateOnly.setHours(0, 0, 0, 0);
                        
                        if (taskDateOnly < today) {
                            isPastDue = true;
                        }
                    }
                }
            } catch(e) {}

            let metaParts = [];
            if (task.subject) metaParts.push(`<span>${escapeHTML(task.subject)}</span>`);
            if (task.desc) metaParts.push(`<span class="task-desc-text-inline">${escapeHTML(task.desc)}</span>`);
            if (formattedDate) {
                const dateClass = isPastDue ? ' class="past-due-date"' : '';
                metaParts.push(`<span${dateClass}>TERMÍN: ${formattedDate}</span>`);
            }

            taskEl.innerHTML = `
                <div class="task-content">
                    <h3 class="task-title">${escapeHTML(task.name)}</h3>
                    <div class="task-meta">
                        ${metaParts.join(' <span class="separator">|</span> ')}
                    </div>
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

    // Submit form handler
    taskForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const nameInput = document.getElementById('task-name');
        const subjectInput = document.getElementById('task-subject');
        const dateInput = document.getElementById('task-date');
        const descInput = document.getElementById('task-desc');

        const newTask = {
            id: Date.now().toString(),
            name: nameInput.value.trim(),
            subject: subjectInput.value,
            date: dateInput.value,
            desc: descInput.value.trim(),
            completed: false,
            createdAt: Date.now()
        };

        if (newTask.name !== '' && newTask.subject !== '' && newTask.date !== '') {
            tasks.push(newTask);
            saveAndRender();
            taskForm.reset();
            nameInput.focus();
        } else {
            alert('Vyplňte prosím všechna povinná pole!');
        }
    });

    // Globální funkce pro přepnutí hotovo/nechystáno
    window.toggleTask = (id) => {
        const task = tasks.find(t => t.id === id);
        if (task) {
            if (!task.completed) {
                if (!confirm('Opravdu chcete označit tento úkol jako hotový?')) {
                    renderTasks(); // Vrátit zobrazení checkboxu
                    return;
                }
                task.completed = true;
                task.completedAt = Date.now();
            } else {
                task.completed = false;
                task.completedAt = null;
            }
            saveAndRender();
        }
    };

    // Globální funkce pro smazání
    window.deleteTask = (id) => {
        if(confirm('Opravdu chcete tento úkol smazat?')) {
            tasks = tasks.filter(t => t.id !== id);
            saveAndRender();
        }
    };

    // Uložení a překreslení s animací (jen drobný efekt na DOM update)
    function saveAndRender() {
        localStorage.setItem('ok_nastenka_tasks', JSON.stringify(tasks));
        renderTasks();
    }

    // Prvotní vykreslení
    renderTasks();
});

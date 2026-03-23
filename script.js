document.addEventListener('DOMContentLoaded', () => {
    const taskForm = document.getElementById('task-form');
    const taskList = document.getElementById('task-list');

    // Nacteni ukolu z uloziste
    let tasks = JSON.parse(localStorage.getItem('ok_nastenka_tasks')) || [];

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
            task.completed = !task.completed;
            saveAndRender();
        }
    };

    // Globální funkce pro smazání
    window.deleteTask = (id) => {
        if (confirm('Opravdu chcete tento úkol smazat?')) {
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

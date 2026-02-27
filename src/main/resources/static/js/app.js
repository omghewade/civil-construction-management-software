// ============================================================
// CivilTrack Enterprise Frontend v3.0  (AI Edition)
// ============================================================
const AI_API_KEY = 'AIzaSyBNtaEhILHvHGyXpfWKTtegqHXMpvS8FHw';
const AI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${AI_API_KEY}`;

async function callAI(prompt, { json = false } = {}) {
    const body = {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: json ? { responseMimeType: 'application/json' } : {}
    };
    const res = await fetch(AI_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });
    if (!res.ok) throw new Error(`AI API error: ${res.status}`);
    const data = await res.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

// ---- State ----
let currentUser = null;
let projectsData = [];
let currentView = 'dashboard';
let currentTaskProjectId = null;
let currentIssueProjectId = null;
let ganttChartInst = null;
let progressChartInst = null;
let budgetChartInst = null;
let equipChartInst = null;
let taskStatusChartInst = null;
let budgetUtilChartInst = null;
let stompClient = null;
let confirmCallback = null;

// ============================================================
// TOAST NOTIFICATION SYSTEM
// ============================================================
function toast(title, message = '', type = 'info', duration = 4000) {
    const icons = { success: 'bx-check-circle', error: 'bx-x-circle', warning: 'bx-error', info: 'bx-info-circle' };
    const container = document.getElementById('toast-container');
    const el = document.createElement('div');
    el.className = `toast toast-${type}`;
    el.innerHTML = `
        <i class='bx ${icons[type]} toast-icon'></i>
        <div class="toast-content">
            <div class="toast-title">${title}</div>
            ${message ? `<div class="toast-message">${message}</div>` : ''}
        </div>
        <i class='bx bx-x btn-icon' style="font-size:1rem;flex-shrink:0;"></i>
    `;
    container.appendChild(el);
    el.onclick = () => dismissToast(el);
    setTimeout(() => dismissToast(el), duration);
    return el;
}

function dismissToast(el) {
    el.classList.add('toast-exit');
    setTimeout(() => el.remove(), 300);
}

// ============================================================
// CONFIRM DIALOG
// ============================================================
function confirm(title, message, callback) {
    document.getElementById('confirm-title').innerText = title;
    document.getElementById('confirm-message').innerText = message;
    confirmCallback = callback;
    openModal('modal-confirm');
}

document.getElementById('confirm-action-btn').onclick = () => {
    closeModal('modal-confirm');
    if (confirmCallback) confirmCallback();
    confirmCallback = null;
};

// ============================================================
// MODAL HELPERS
// ============================================================
function openModal(id) {
    document.getElementById(id).classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}
function closeModal(id) {
    document.getElementById(id).classList.add('hidden');
    document.body.style.overflow = '';
}

document.querySelectorAll('[data-close]').forEach(btn => {
    btn.addEventListener('click', () => closeModal(btn.dataset.close));
});

document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', e => {
        if (e.target === overlay) closeModal(overlay.id);
    });
});

// ============================================================
// NAVIGATION
// ============================================================
function navigate(view) {
    document.querySelectorAll('.view-content').forEach(v => v.classList.add('hidden'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

    const viewEl = document.getElementById(`view-${view}`);
    if (viewEl) viewEl.classList.remove('hidden');

    const navEl = document.getElementById(`nav-${view}`);
    if (navEl) navEl.classList.add('active');

    const titles = {
        dashboard: 'Dashboard', analytics: 'Analytics', projects: 'Projects',
        tasks: 'Tasks', gantt: 'Gantt Chart', resources: 'Resource Management',
        issues: 'Issues & Risks', gallery: '3D Gallery', users: 'User Management',
        'material-grades': 'Material Grades & Inventory',
        'ai-decisions': 'AI Construction Decision Engine',
        'bio-cement': 'Bio-Cement Manufacturing Lab'
    };
    document.getElementById('page-title').innerText = titles[view] || 'CivilTrack';
    currentView = view;

    if (view === 'dashboard') loadDashboard();
    if (view === 'analytics') loadAnalytics();
    if (view === 'projects') loadProjects();
    if (view === 'tasks') loadTasksView();
    if (view === 'gantt') loadGanttView();
    if (view === 'resources') loadResourcesView();
    if (view === 'issues') loadIssuesView();
    if (view === 'gallery') loadGalleryView();
    if (view === 'users') loadUsersView();
    if (view === 'material-grades') loadMaterialGrades();
    if (view === 'ai-decisions') initAIDecisions();
    if (view === 'bio-cement') loadBioCement();
}

document.querySelectorAll('.nav-item[data-view]').forEach(item => {
    item.addEventListener('click', e => {
        e.preventDefault();
        navigate(item.dataset.view);
    });
});

// ============================================================
// AUTH FLOW
// ============================================================
async function initApp() {
    try {
        currentUser = await API.checkAuth();
        showApp();
    } catch {
        document.getElementById('login-screen').classList.remove('hidden');
        document.getElementById('app-screen').classList.add('hidden');
    }
}

document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('login-btn');
    btn.innerHTML = `<i class='bx bx-loader-alt bx-spin'></i> Signing in...`;
    btn.disabled = true;
    try {
        currentUser = await API.login(
            document.getElementById('login-username').value.trim(),
            document.getElementById('login-password').value
        );
        showApp();
    } catch {
        document.getElementById('login-error').innerText = 'Invalid credentials. Please try again.';
        document.getElementById('login-error').classList.remove('hidden');
        btn.innerHTML = `<i class='bx bx-log-in'></i> Sign In`;
        btn.disabled = false;
    }
});

document.getElementById('logout-btn').addEventListener('click', async () => {
    await API.logout();
    location.reload();
});

function showApp() {
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('app-screen').classList.remove('hidden');
    document.getElementById('user-name-display').innerText = currentUser.name || currentUser.username;
    document.getElementById('user-role-display').innerText = (currentUser.role || 'VIEWER').replace('ROLE_', '').replace('_', ' ');

    // Hide admin-only nav for non-admins
    const role = (currentUser.role || '').toUpperCase();
    if (!role.includes('ADMIN')) {
        const usersNav = document.getElementById('nav-users');
        if (usersNav) usersNav.style.display = 'none';
    }

    initWebSocket();
    loadDashboard();
    loadActivityFeed();
    fetchWeather();
    updateIssuesBadge();
}

// ============================================================
// WEBSOCKET
// ============================================================
function initWebSocket() {
    try {
        const socket = new SockJS('/ws');
        stompClient = Stomp.over(socket);
        stompClient.debug = null;
        stompClient.connect({}, () => {
            stompClient.subscribe('/topic/updates', msg => {
                const data = JSON.parse(msg.body);
                addActivityItem(data.message, data.timestamp);
                if (currentView === 'dashboard') loadDashboard();
            });
        });
    } catch (e) { /* WebSocket optional */ }
}

// ============================================================
// REFRESH
// ============================================================
document.getElementById('refresh-btn').addEventListener('click', () => {
    navigate(currentView);
    toast('Refreshed', 'Data reloaded successfully.', 'info', 2500);
});

// ============================================================
// WEATHER
// ============================================================
async function fetchWeather() {
    try {
        const w = await API.getWeather();
        const temp = w.current.temperature_2m;
        const precip = w.current.precipitation;
        let icon = 'bx-cloud', desc = 'Cloudy';
        if (precip > 0) { icon = 'bx-cloud-rain'; desc = 'Rain - Caution'; }
        else if (temp > 35) { icon = 'bx-sun'; desc = 'Hot Site'; }
        else if (temp < 15) { icon = 'bx-cloud-snow'; desc = 'Cold Site'; }
        else { icon = 'bx-cloud-light-rain'; desc = 'Partly Cloudy'; }

        document.getElementById('stat-weather').innerText = `${temp}°C`;
        document.getElementById('stat-weather-sub').innerText = desc;
        document.querySelector('#stat-weather').closest('.stat-card').querySelector('.stat-icon').innerHTML = `<i class='bx ${icon}'></i>`;

        if (precip > 5) {
            toast('⛈️ Weather Alert', `Heavy rain (${precip}mm) detected. Review outdoor schedules.`, 'warning', 8000);
        }
    } catch {
        document.getElementById('stat-weather').innerText = 'N/A';
    }
}

// ============================================================
// KEYBOARD SHORTCUTS
// ============================================================
document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 'k') { e.preventDefault(); document.getElementById('global-search').focus(); }
    if (e.ctrlKey && e.key === 'n') { e.preventDefault(); openNewProjectModal(); }
    if (e.key === 'Escape') { document.querySelectorAll('.modal-overlay:not(.hidden)').forEach(m => closeModal(m.id)); }
    if (e.key === 'F5') { e.preventDefault(); navigate(currentView); }
});

// ============================================================
// GLOBAL SEARCH
// ============================================================
document.getElementById('global-search').addEventListener('input', async (e) => {
    const q = e.target.value.trim().toLowerCase();
    if (q.length < 2) return;
    const projects = await API.getProjects();
    const matches = projects.filter(p => p.name.toLowerCase().includes(q));
    if (matches.length > 0) {
        toast(`Found`, `${matches.length} matching project(s): ${matches.map(p => p.name).join(', ')}`, 'info', 4000);
    }
});

// ============================================================
// ACTIVITY FEED
// ============================================================
async function loadActivityFeed() {
    try {
        const logs = await API.getRecentLogs();
        const feed = document.getElementById('activity-feed');
        feed.innerHTML = '';
        logs.forEach(log => addActivityItem(log.message, log.timestamp));
    } catch { }
}

function addActivityItem(message, timestamp) {
    const feed = document.getElementById('activity-feed');
    const item = document.createElement('div');
    item.className = 'activity-item';
    item.innerHTML = `
        <div>${message}</div>
        <div class="activity-time">${timestamp ? new Date(timestamp).toLocaleTimeString() : 'Just now'}</div>
    `;
    feed.prepend(item);
    while (feed.children.length > 30) feed.lastChild.remove();
}

// ============================================================
// ISSUES BADGE
// ============================================================
async function updateIssuesBadge() {
    try {
        const projects = await API.getProjects();
        let openCritical = 0;
        for (const p of projects) {
            const issues = await API.getIssues(p.id);
            openCritical += issues.filter(i => i.status === 'OPEN' && (i.severity === 'CRITICAL' || i.severity === 'HIGH')).length;
        }
        const badge = document.getElementById('issues-badge');
        if (openCritical > 0) {
            badge.style.display = '';
            badge.innerText = openCritical;
        } else {
            badge.style.display = 'none';
        }
    } catch { }
}

// ============================================================
// DASHBOARD
// ============================================================
async function loadDashboard() {
    try {
        projectsData = await API.getProjects();
        const total = projectsData.length;
        let budget = 0, completion = 0, delayed = 0, spent = 0;
        let hasCritical = false, hasWarning = false;

        projectsData.forEach(p => {
            budget += p.budget || 0;
            completion += p.completionPercentage || 0;
            if (p.healthScore === 'CRITICAL') hasCritical = true;
            if (p.healthScore === 'WARNING') hasWarning = true;
            (p.tasks || []).forEach(t => {
                if (t.status === 'DELAYED') delayed++;
                spent += t.actualCost || 0;
            });
        });

        animateCount('stat-projects', total);
        document.getElementById('stat-completion').innerText = total > 0 ? Math.round(completion / total) + '%' : '0%';
        document.getElementById('stat-budget').innerText = '₹' + budget.toLocaleString('en-IN');
        animateCount('stat-delayed', delayed);
        document.getElementById('stat-budget-sub').innerText = `₹${spent.toLocaleString('en-IN')} spent`;

        const healthEl = document.getElementById('stat-health');
        if (hasCritical) { healthEl.innerText = 'CRITICAL'; healthEl.style.color = 'var(--accent-danger)'; }
        else if (hasWarning) { healthEl.innerText = 'WARNING'; healthEl.style.color = 'var(--accent-warning)'; }
        else { healthEl.innerText = 'EXCELLENT'; healthEl.style.color = 'var(--accent-success)'; }

        renderDashboardCharts(projectsData);
    } catch (e) { console.error('Dashboard error', e); toast('Error', 'Failed to load dashboard.', 'error'); }
}

function animateCount(id, target) {
    const el = document.getElementById(id);
    if (!el) return;
    const start = parseInt(el.innerText) || 0;
    const duration = 600;
    const startTime = performance.now();
    function step(now) {
        const t = Math.min((now - startTime) / duration, 1);
        el.innerText = Math.round(start + (target - start) * t);
        if (t < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
}

function renderDashboardCharts(data) {
    const labels = data.map(p => p.name.length > 18 ? p.name.substring(0, 18) + '…' : p.name);
    const completions = data.map(p => p.completionPercentage || 0);
    const budgets = data.map(p => p.budget || 0);
    const actuals = data.map(p => (p.tasks || []).reduce((a, t) => a + (t.actualCost || 0), 0));

    const chartDefaults = {
        plugins: { legend: { labels: { color: '#8fa8c8', font: { size: 12 } } } },
        scales: {
            x: { ticks: { color: '#4d6480' }, grid: { color: 'rgba(255,255,255,0.04)' } },
            y: { ticks: { color: '#4d6480' }, grid: { color: 'rgba(255,255,255,0.04)' } }
        }
    };

    if (progressChartInst) progressChartInst.destroy();
    progressChartInst = new Chart(document.getElementById('chart-progress'), {
        type: 'bar',
        data: {
            labels,
            datasets: [{ label: 'Completion %', data: completions, backgroundColor: 'rgba(59,130,246,0.6)', borderColor: '#3b82f6', borderWidth: 1, borderRadius: 6 }]
        },
        options: { ...chartDefaults, plugins: { ...chartDefaults.plugins }, scales: { ...chartDefaults.scales, y: { ...chartDefaults.scales.y, min: 0, max: 100 } } }
    });

    if (budgetChartInst) budgetChartInst.destroy();
    budgetChartInst = new Chart(document.getElementById('chart-budget'), {
        type: 'line',
        data: {
            labels,
            datasets: [
                { label: 'Budget', data: budgets, borderColor: '#10b981', backgroundColor: 'rgba(16,185,129,0.1)', tension: 0.4, fill: true, pointBackgroundColor: '#10b981' },
                { label: 'Actual Cost', data: actuals, borderColor: '#ef4444', backgroundColor: 'rgba(239,68,68,0.1)', tension: 0.4, fill: true, pointBackgroundColor: '#ef4444' }
            ]
        },
        options: chartDefaults
    });
}

// ============================================================
// ANALYTICS
// ============================================================
async function loadAnalytics() {
    try {
        projectsData = await API.getProjects();
        let totalBudget = 0, totalSpent = 0, totalTasks = 0, totalCompletion = 0;
        let taskStatuses = { NOT_STARTED: 0, IN_PROGRESS: 0, COMPLETED: 0, DELAYED: 0 };

        const tbody = document.getElementById('analytics-table-body');
        tbody.innerHTML = '';

        projectsData.forEach(p => {
            totalBudget += p.budget || 0;
            totalCompletion += p.completionPercentage || 0;
            const tasks = p.tasks || [];
            totalTasks += tasks.length;
            const spent = tasks.reduce((a, t) => a + (t.actualCost || 0), 0);
            totalSpent += spent;
            tasks.forEach(t => { if (taskStatuses[t.status] !== undefined) taskStatuses[t.status]++; });

            const utilPct = p.budget > 0 ? Math.min(100, Math.round((spent / p.budget) * 100)) : 0;
            const health = p.healthScore || 'N/A';
            const healthColor = health === 'CRITICAL' ? 'var(--accent-danger)' : health === 'WARNING' ? 'var(--accent-warning)' : 'var(--accent-success)';
            tbody.innerHTML += `<tr>
                <td><strong>${p.name}</strong></td>
                <td>₹${(p.budget || 0).toLocaleString('en-IN')}</td>
                <td>₹${spent.toLocaleString('en-IN')}</td>
                <td>
                    <div class="inline-progress">
                        <div class="inline-progress-bar"><div class="inline-progress-fill" style="width:${utilPct}%"></div></div>
                        <span class="inline-progress-text">${utilPct}%</span>
                    </div>
                </td>
                <td>${tasks.length}</td>
                <td>${Math.round(p.completionPercentage || 0)}%</td>
                <td><strong style="color:${healthColor}">${health}</strong></td>
            </tr>`;
        });

        document.getElementById('kpi-total-budget').innerText = '₹' + totalBudget.toLocaleString('en-IN');
        document.getElementById('kpi-spent').innerText = '₹' + totalSpent.toLocaleString('en-IN');
        document.getElementById('kpi-tasks').innerText = totalTasks;
        document.getElementById('kpi-completion').innerText = projectsData.length > 0 ? Math.round(totalCompletion / projectsData.length) + '%' : '0%';

        if (taskStatusChartInst) taskStatusChartInst.destroy();
        taskStatusChartInst = new Chart(document.getElementById('chart-task-status'), {
            type: 'doughnut',
            data: {
                labels: ['Not Started', 'In Progress', 'Completed', 'Delayed'],
                datasets: [{ data: [taskStatuses.NOT_STARTED, taskStatuses.IN_PROGRESS, taskStatuses.COMPLETED, taskStatuses.DELAYED], backgroundColor: ['#4d6480', '#3b82f6', '#10b981', '#ef4444'], borderWidth: 0 }]
            },
            options: { plugins: { legend: { position: 'bottom', labels: { color: '#8fa8c8' } } }, cutout: '65%' }
        });

        if (budgetUtilChartInst) budgetUtilChartInst.destroy();
        budgetUtilChartInst = new Chart(document.getElementById('chart-budget-util'), {
            type: 'bar',
            data: {
                labels: projectsData.map(p => p.name.length > 14 ? p.name.substring(0, 14) + '…' : p.name),
                datasets: [
                    { label: 'Budget (₹)', data: projectsData.map(p => p.budget || 0), backgroundColor: 'rgba(16,185,129,0.5)', borderRadius: 6 },
                    { label: 'Spent (₹)', data: projectsData.map(p => (p.tasks || []).reduce((a, t) => a + (t.actualCost || 0), 0)), backgroundColor: 'rgba(239,68,68,0.5)', borderRadius: 6 }
                ]
            },
            options: { plugins: { legend: { labels: { color: '#8fa8c8' } } }, scales: { x: { ticks: { color: '#4d6480' }, grid: { color: 'rgba(255,255,255,0.04)' } }, y: { ticks: { color: '#4d6480' }, grid: { color: 'rgba(255,255,255,0.04)' } } } }
        });
    } catch (e) { console.error('Analytics error', e); toast('Error', 'Failed to load analytics.', 'error'); }
}

// ============================================================
// PROJECTS
// ============================================================
async function loadProjects() {
    const tbody = document.getElementById('projects-table-body');
    tbody.innerHTML = `<tr><td colspan="8" class="text-center"><span class="skeleton skeleton-text" style="margin:auto;"></span></td></tr>`;
    try {
        projectsData = await API.getProjects();
        tbody.innerHTML = '';
        if (projectsData.length === 0) {
            tbody.innerHTML = `<tr><td colspan="8" class="text-center text-muted" style="padding:2rem;">No projects found. Create the first one!</td></tr>`;
            return;
        }
        projectsData.forEach(p => {
            const health = p.healthScore || 'N/A';
            const hc = health === 'CRITICAL' ? 'var(--accent-danger)' : health === 'WARNING' ? 'var(--accent-warning)' : 'var(--accent-success)';
            tbody.innerHTML += `<tr>
                <td><strong>${p.name}</strong><br><small class="text-muted">${p.description || ''}</small></td>
                <td><span class="badge status-${(p.status || '').toLowerCase()}">${p.status || ''}</span></td>
                <td>₹${(p.budget || 0).toLocaleString('en-IN')}</td>
                <td>
                    <div class="inline-progress">
                        <div class="inline-progress-bar"><div class="inline-progress-fill" style="width:${p.completionPercentage || 0}%"></div></div>
                        <span class="inline-progress-text">${Math.round(p.completionPercentage || 0)}%</span>
                    </div>
                </td>
                <td class="text-muted" style="font-size:0.8rem;">${p.startDate || '—'}</td>
                <td class="text-muted" style="font-size:0.8rem;">${p.endDate || '—'}</td>
                <td><strong style="color:${hc}">${health}</strong></td>
                <td>
                    <div class="task-actions">
                        <button class="btn-icon" title="AI Risk Analysis" style="color:#a78bfa" onclick="analyzeProjectRisk(${p.id})"><i class='bx bx-brain'></i></button>
                        <button class="btn-icon" title="Edit" onclick="openEditProjectModal(${p.id})"><i class='bx bx-edit'></i></button>
                        <button class="btn-icon" title="Delete" style="color:var(--accent-danger)" onclick="deleteProject(${p.id},'${p.name}')"><i class='bx bx-trash'></i></button>
                    </div>
                </td>
            </tr>`;
        });
    } catch (e) { toast('Error', 'Failed to load projects.', 'error'); }
}

async function openNewProjectModal() {
    document.getElementById('modal-project-title').innerText = 'New Project';
    document.getElementById('project-edit-id').value = '';
    document.getElementById('project-name').value = '';
    document.getElementById('project-start').value = '';
    document.getElementById('project-end').value = '';
    document.getElementById('project-budget').value = '';
    document.getElementById('project-description').value = '';
    document.getElementById('project-status').value = 'PLANNED';
    const engineers = await API.getEngineers().catch(() => []);
    const sel = document.getElementById('project-manager');
    sel.innerHTML = '<option value="">Select Manager</option>' + engineers.map(e => `<option value="${e.id}">${e.name || e.username}</option>`).join('');
    openModal('modal-project');
}

async function openEditProjectModal(id) {
    const p = projectsData.find(p => p.id === id);
    if (!p) return;
    document.getElementById('modal-project-title').innerText = 'Edit Project';
    document.getElementById('project-edit-id').value = p.id;
    document.getElementById('project-name').value = p.name;
    document.getElementById('project-start').value = p.startDate || '';
    document.getElementById('project-end').value = p.endDate || '';
    document.getElementById('project-budget').value = p.budget;
    document.getElementById('project-description').value = p.description || '';
    document.getElementById('project-status').value = p.status || 'PLANNED';
    openModal('modal-project');
}

document.getElementById('new-project-btn').addEventListener('click', openNewProjectModal);

document.getElementById('save-project-btn').addEventListener('click', async () => {
    const id = document.getElementById('project-edit-id').value;
    const payload = {
        name: document.getElementById('project-name').value.trim(),
        startDate: document.getElementById('project-start').value,
        endDate: document.getElementById('project-end').value,
        budget: parseFloat(document.getElementById('project-budget').value) || 0,
        description: document.getElementById('project-description').value,
        status: document.getElementById('project-status').value,
    };
    if (!payload.name) { toast('Validation', 'Project name is required.', 'warning'); return; }
    try {
        if (id) {
            await fetchAPI(`/api/projects/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
            toast('Updated', `"${payload.name}" has been updated.`, 'success');
        } else {
            await API.createProject(payload);
            toast('Created', `"${payload.name}" project created successfully.`, 'success');
        }
        closeModal('modal-project');
        if (currentView === 'projects') loadProjects();
        else loadDashboard();
    } catch (e) { toast('Error', 'Failed to save project.', 'error'); }
});

async function deleteProject(id, name) {
    confirm('Delete Project', `Delete "${name}"? This will remove all tasks, milestones, and resources permanently.`, async () => {
        try {
            await fetchAPI(`/api/projects/${id}`, { method: 'DELETE' });
            toast('Deleted', `"${name}" has been removed.`, 'success');
            loadProjects();
        } catch { toast('Error', 'Failed to delete project.', 'error'); }
    });
}

// ============================================================
// TASKS
// ============================================================
async function loadTasksView() {
    try {
        projectsData = await API.getProjects();
        const sel = document.getElementById('task-project-filter');
        const existing = sel.value;
        sel.innerHTML = '<option value="">— Select Project —</option>';
        projectsData.forEach(p => sel.innerHTML += `<option value="${p.id}">${p.name}</option>`);
        if (existing) { sel.value = existing; }
        else if (projectsData.length > 0) { sel.value = projectsData[0].id; }
        sel.onchange = () => { currentTaskProjectId = sel.value; renderTasks(); };
        if (sel.value) { currentTaskProjectId = sel.value; renderTasks(); }

        const statusSel = document.getElementById('task-status-filter');
        statusSel.onchange = renderTasks;
    } catch (e) { toast('Error', 'Failed to load tasks view.', 'error'); }
}

async function renderTasks() {
    if (!currentTaskProjectId) return;
    const container = document.getElementById('task-grid-container');
    container.innerHTML = `<div class="skeleton skeleton-card"></div><div class="skeleton skeleton-card"></div>`;
    try {
        const tasks = await API.getTasks(currentTaskProjectId);
        const statusFilter = document.getElementById('task-status-filter').value;
        const filtered = statusFilter ? tasks.filter(t => t.status === statusFilter) : tasks;
        container.innerHTML = '';
        if (filtered.length === 0) {
            container.innerHTML = `<div class="empty-state glass-card" style="grid-column:1/-1;"><i class='bx bx-task'></i><p>No tasks found. Add the first task!</p></div>`;
            return;
        }
        filtered.forEach(task => {
            const card = document.createElement('div');
            card.className = `task-card glass-card task-${(task.status || '').toLowerCase()}`;
            const pct = task.progress || 0;
            card.innerHTML = `
                <div class="task-header">
                    <div>
                        <h3 class="task-title">${task.name}</h3>
                        <div class="task-dates"><i class='bx bx-calendar'></i> ${task.startDate || '?'} → ${task.endDate || '?'}</div>
                    </div>
                    <span class="badge status-${(task.status || '').toLowerCase()}">${task.status || ''}</span>
                </div>
                <div>
                    <div style="display:flex;justify-content:space-between;font-size:0.78rem;color:var(--text-muted);margin-bottom:0.4rem;">
                        <span>Progress</span><span>${pct}%</span>
                    </div>
                    <div class="progress-bar-container">
                        <div class="progress-bar-fill" style="width:${pct}%"></div>
                    </div>
                </div>
                <div class="task-meta">
                    <span>Cost: ₹${(task.estimatedCost || 0).toLocaleString('en-IN')}</span>
                    <div class="task-actions">
                        <button class="btn-icon" title="AI Estimate" style="color:#a78bfa" onclick="aiEstimateTask('${task.name}')">
                            <i class='bx bx-brain'></i>
                        </button>
                        <button class="btn-icon" title="Update Progress" onclick="openProgressModal(${task.id},'${task.name}',${pct},${task.actualCost || 0})">
                            <i class='bx bx-trending-up'></i>
                        </button>
                        <button class="btn-icon" title="Delete Task" style="color:var(--accent-danger);" onclick="deleteTask(${task.id},'${task.name}')">
                            <i class='bx bx-trash'></i>
                        </button>
                    </div>
                </div>
            `;
            container.appendChild(card);
        });
    } catch (e) { toast('Error', 'Failed to load tasks.', 'error'); }
}

document.getElementById('add-task-btn').addEventListener('click', async () => {
    if (!currentTaskProjectId) { toast('Select Project', 'Please select a project first.', 'warning'); return; }
    document.getElementById('modal-task-title').innerText = 'Add Task';
    document.getElementById('task-edit-id').value = '';
    document.getElementById('task-name').value = '';
    document.getElementById('task-start').value = '';
    document.getElementById('task-end').value = '';
    document.getElementById('task-progress').value = '0';
    document.getElementById('task-cost').value = '0';
    document.getElementById('task-status').value = 'NOT_STARTED';
    const engineers = await API.getEngineers().catch(() => []);
    const sel = document.getElementById('task-assignee');
    sel.innerHTML = '<option value="">Unassigned</option>' + engineers.map(e => `<option value="${e.id}">${e.name || e.username}</option>`).join('');
    openModal('modal-task');
});

document.getElementById('save-task-btn').addEventListener('click', async () => {
    const name = document.getElementById('task-name').value.trim();
    if (!name) { toast('Validation', 'Task name is required.', 'warning'); return; }
    const payload = {
        name,
        startDate: document.getElementById('task-start').value,
        endDate: document.getElementById('task-end').value,
        progress: parseInt(document.getElementById('task-progress').value) || 0,
        estimatedCost: parseFloat(document.getElementById('task-cost').value) || 0,
        status: document.getElementById('task-status').value,
    };
    try {
        await API.createTask(currentTaskProjectId, payload);
        toast('Task Added', `"${name}" added to the project.`, 'success');
        closeModal('modal-task');
        renderTasks();
    } catch (e) { toast('Error', 'Failed to save task.', 'error'); }
});

async function deleteTask(id, name) {
    confirm('Delete Task', `Delete task "${name}"?`, async () => {
        try {
            await fetchAPI(`/api/tasks/${id}`, { method: 'DELETE' });
            toast('Deleted', `Task "${name}" removed.`, 'success');
            renderTasks();
        } catch { toast('Error', 'Cannot delete task.', 'error'); }
    });
}

// Progress modal
function openProgressModal(id, name, progress, cost) {
    document.getElementById('progress-task-id').value = id;
    document.getElementById('progress-task-name').innerText = name;
    const slider = document.getElementById('progress-slider');
    slider.value = progress;
    document.getElementById('progress-value-label').innerText = progress;
    slider.oninput = () => document.getElementById('progress-value-label').innerText = slider.value;
    document.getElementById('progress-cost').value = cost;
    openModal('modal-progress');
}

document.getElementById('save-progress-btn').addEventListener('click', async () => {
    const id = document.getElementById('progress-task-id').value;
    const progress = document.getElementById('progress-slider').value;
    const cost = document.getElementById('progress-cost').value;
    try {
        await API.updateTaskProgress(id, progress, cost);
        toast('Updated', 'Task progress saved.', 'success');
        closeModal('modal-progress');
        renderTasks();
    } catch (e) { toast('Error', 'Failed to update progress.', 'error'); }
});

// ============================================================
// GANTT CHART
// ============================================================
async function loadGanttView() {
    try {
        projectsData = await API.getProjects();
        const sel = document.getElementById('gantt-project-filter');
        sel.innerHTML = '<option value="">— Select Project —</option>';
        projectsData.forEach(p => sel.innerHTML += `<option value="${p.id}">${p.name}</option>`);
        if (projectsData.length > 0) sel.value = projectsData[0].id;
        sel.onchange = () => renderGantt(sel.value);
        if (sel.value) renderGantt(sel.value);
    } catch { }
}

async function renderGantt(projectId) {
    if (!projectId) return;
    const tasks = await API.getTasks(projectId).catch(() => []);
    if (tasks.length === 0) {
        toast('No Tasks', 'This project has no tasks to display on the Gantt chart.', 'info');
        return;
    }

    // Find overall date range
    const allDates = tasks.flatMap(t => [t.startDate, t.endDate]).filter(Boolean).map(d => new Date(d));
    const minDate = new Date(Math.min(...allDates));
    const maxDate = new Date(Math.max(...allDates));
    const totalDays = Math.max(1, (maxDate - minDate) / 86400000);

    const statusColors = { NOT_STARTED: 'rgba(100,116,139,0.6)', IN_PROGRESS: 'rgba(59,130,246,0.6)', COMPLETED: 'rgba(16,185,129,0.6)', DELAYED: 'rgba(239,68,68,0.6)' };

    const datasets = tasks.map(task => {
        const start = task.startDate ? (new Date(task.startDate) - minDate) / 86400000 : 0;
        const end = task.endDate ? (new Date(task.endDate) - minDate) / 86400000 : start + 7;
        return {
            label: task.name,
            data: [{ x: start, y: task.name, w: end - start }],
            backgroundColor: statusColors[task.status] || 'rgba(59,130,246,0.5)',
            borderColor: 'transparent',
            borderRadius: 4,
        };
    });

    if (ganttChartInst) ganttChartInst.destroy();
    ganttChartInst = new Chart(document.getElementById('chart-gantt'), {
        type: 'bar',
        data: {
            labels: tasks.map(t => t.name),
            datasets: [{
                label: 'Duration',
                data: tasks.map(t => {
                    const s = t.startDate ? (new Date(t.startDate) - minDate) / 86400000 : 0;
                    const e = t.endDate ? (new Date(t.endDate) - minDate) / 86400000 : s + 7;
                    return [s, e];
                }),
                backgroundColor: tasks.map(t => statusColors[t.status] || 'rgba(59,130,246,0.5)'),
                borderRadius: 4,
                borderSkipped: false,
            }]
        },
        options: {
            indexAxis: 'y',
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: ctx => {
                            const t = tasks[ctx.dataIndex];
                            return ` ${t.startDate || '?'} → ${t.endDate || '?'} (${t.status})`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    min: 0, max: totalDays,
                    ticks: { color: '#4d6480', callback: v => `Day ${v}` },
                    grid: { color: 'rgba(255,255,255,0.04)' }
                },
                y: { ticks: { color: '#8fa8c8' }, grid: { display: false } }
            }
        }
    });
}

// ============================================================
// RESOURCES
// ============================================================
async function loadResourcesView() {
    try {
        projectsData = await API.getProjects();
        const sel = document.getElementById('resource-project-filter');
        sel.innerHTML = '<option value="">— Select Project —</option>';
        projectsData.forEach(p => sel.innerHTML += `<option value="${p.id}">${p.name}</option>`);
        if (projectsData.length > 0) sel.value = projectsData[0].id;
        sel.onchange = () => renderResourceDashboard(sel.value);
        if (sel.value) renderResourceDashboard(sel.value);
    } catch { }
}

async function renderResourceDashboard(projectId) {
    document.getElementById('resource-empty-state').classList.add('hidden');
    document.getElementById('resource-stats').classList.remove('hidden');

    const [equipment, labor, materials] = await Promise.all([
        API.getEquipment(projectId).catch(() => []),
        API.getLaborForce(projectId).catch(() => []),
        API.getMaterials(projectId).catch(() => [])
    ]);

    const totalInUse = equipment.reduce((a, e) => a + (e.inUse || 0), 0);
    const totalWorkers = labor.reduce((a, l) => a + (l.count || 0), 0);
    const lowStock = materials.filter(m => m.totalAvailable > 0 && m.dailyConsumptionRate > 0 && (m.totalAvailable / m.dailyConsumptionRate) <= 7).length;

    document.getElementById('res-equip-inuse').innerText = totalInUse;
    document.getElementById('res-workers').innerText = totalWorkers;
    document.getElementById('res-low-stock').innerText = lowStock;
    if (lowStock > 0) toast('Low Stock Alert', `${lowStock} material(s) have less than 7 days supply remaining.`, 'warning');

    renderEquipmentChart(equipment);
    renderLaborTable(labor);
    renderMaterialTable(materials);

    document.getElementById('equip-chart-card').classList.remove('hidden');
    document.getElementById('labor-table-card').classList.remove('hidden');
    document.getElementById('material-table-card').classList.remove('hidden');
}

function renderEquipmentChart(equipList) {
    if (equipChartInst) equipChartInst.destroy();
    if (!equipList || equipList.length === 0) return;
    equipChartInst = new Chart(document.getElementById('chart-equipment'), {
        type: 'bar',
        data: {
            labels: equipList.map(e => e.name),
            datasets: [
                { label: 'In Use', data: equipList.map(e => e.inUse || 0), backgroundColor: 'rgba(16,185,129,0.7)', borderRadius: 4 },
                { label: 'Maintenance', data: equipList.map(e => e.inMaintenance || 0), backgroundColor: 'rgba(239,68,68,0.7)', borderRadius: 4 },
                { label: 'Idle', data: equipList.map(e => Math.max(0, (e.totalQuantity || 0) - (e.inUse || 0) - (e.inMaintenance || 0))), backgroundColor: 'rgba(100,116,139,0.5)', borderRadius: 4 },
            ]
        },
        options: { plugins: { legend: { labels: { color: '#8fa8c8', font: { size: 11 } } } }, scales: { x: { stacked: true, ticks: { color: '#4d6480' }, grid: { display: false } }, y: { stacked: true, ticks: { color: '#4d6480' }, grid: { color: 'rgba(255,255,255,0.04)' } } } }
    });
}

function renderLaborTable(laborList) {
    const tbody = document.getElementById('labor-table-body');
    tbody.innerHTML = '';
    if (!laborList || laborList.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted" style="padding:1.5rem;">No labor data.</td></tr>`;
        return;
    }
    laborList.forEach(l => {
        const pending = Math.max(0, (l.count * l.dailyWage * l.daysWorked) - l.totalPaid);
        tbody.innerHTML += `<tr>
            <td><strong>${l.workerType}</strong></td>
            <td>${l.count} workers</td>
            <td>₹${l.dailyWage}</td>
            <td>${l.daysWorked} days</td>
            <td class="text-success">₹${l.totalPaid.toLocaleString('en-IN')}</td>
            <td>${pending > 0 ? `<span class="badge" style="background:rgba(245,158,11,0.15);color:var(--accent-warning);border:1px solid rgba(245,158,11,0.3);">₹${pending.toLocaleString('en-IN')} pending</span>` : '<span class="text-success">Paid ✓</span>'}</td>
        </tr>`;
    });
}

function renderMaterialTable(materialList) {
    const tbody = document.getElementById('material-table-body');
    tbody.innerHTML = '';
    if (!materialList || materialList.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted" style="padding:1.5rem;">No material data.</td></tr>`;
        return;
    }
    materialList.forEach(m => {
        const daysLeft = m.totalAvailable > 0 && m.dailyConsumptionRate > 0 ? Math.floor(m.totalAvailable / m.dailyConsumptionRate) : 999;
        const indicator = daysLeft <= 3 ? '🔴' : daysLeft <= 7 ? '🟡' : '🟢';
        const daysColor = daysLeft <= 3 ? 'var(--accent-danger)' : daysLeft <= 7 ? 'var(--accent-warning)' : 'var(--accent-success)';
        tbody.innerHTML += `<tr>
            <td><strong>${m.name}</strong></td>
            <td>${m.totalAvailable}</td>
            <td>${m.dailyConsumptionRate}/day</td>
            <td style="color:${daysColor}; font-weight:600;">${indicator} ${daysLeft < 999 ? daysLeft + ' days' : 'Unlimited'}</td>
            <td class="text-muted">${m.refillDateTarget || 'N/A'}</td>
        </tr>`;
    });
}

// ============================================================
// ISSUES
// ============================================================
async function loadIssuesView() {
    try {
        projectsData = await API.getProjects();
        const sel = document.getElementById('issue-project-filter');
        sel.innerHTML = '<option value="">— Select Project —</option>';
        projectsData.forEach(p => sel.innerHTML += `<option value="${p.id}">${p.name}</option>`);
        if (projectsData.length > 0) sel.value = projectsData[0].id;
        currentIssueProjectId = sel.value;
        sel.onchange = () => { currentIssueProjectId = sel.value; renderIssues(); };
        if (sel.value) renderIssues();
    } catch { }
}

async function renderIssues() {
    if (!currentIssueProjectId) return;
    const tbody = document.getElementById('issues-table-body');
    tbody.innerHTML = `<tr><td colspan="7" class="text-center"><span class="skeleton skeleton-text" style="margin:auto;"></span></td></tr>`;
    const issues = await API.getIssues(currentIssueProjectId).catch(() => []);
    tbody.innerHTML = '';
    if (issues.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted" style="padding:2rem;">No issues reported. Site is clean! 🎉</td></tr>`;
        return;
    }
    issues.forEach(iss => {
        const sevColor = { CRITICAL: 'var(--accent-danger)', HIGH: 'var(--accent-warning)', MEDIUM: '#f59e0b', LOW: 'var(--accent-success)' }[iss.severity] || '#888';
        tbody.innerHTML += `<tr>
            <td><strong>${iss.title}</strong><br><small class="text-muted">${iss.description || ''}</small></td>
            <td>${(iss.category || '').replace(/_/g, ' ')}</td>
            <td><strong style="color:${sevColor}">${iss.severity}</strong></td>
            <td><span class="badge status-${(iss.status || '').toLowerCase()}">${iss.status}</span></td>
            <td class="text-muted">${iss.reportedBy || '—'}</td>
            <td class="text-muted">${iss.createdAt || '—'}</td>
            <td>
                <div class="task-actions">
                    <button class="btn btn-secondary btn-sm" style="color:#a78bfa;border-color:#a78bfa33;" onclick="aiFixSuggestion(${iss.id},'${(iss.title || '').replace(/'/g, '')}',' ${(iss.severity || '')}','${(iss.category || '').replace(/_/g, ' ')}','${(iss.description || '').replace(/'/g, '').substring(0, 80)}')"><i class='bx bx-brain'></i> AI Fix</button>
                    ${iss.status !== 'RESOLVED' ? `<button class="btn btn-success btn-sm" onclick="resolveIssue(${iss.id})"><i class='bx bx-check'></i> Resolve</button>` : ''}
                </div>
            </td>
        </tr>
        <tr id="ai-fix-row-${iss.id}" class="hidden">
            <td colspan="7" style="padding:0.5rem 1rem 0.8rem;">
                <div id="ai-fix-content-${iss.id}" class="ai-chat-box" style="max-height:200px;"></div>
            </td>
        </tr>`;
    });
}

document.getElementById('report-issue-btn').addEventListener('click', () => {
    if (!currentIssueProjectId) { toast('Select Project', 'Please select a project first.', 'warning'); return; }
    document.getElementById('issue-title').value = '';
    document.getElementById('issue-description').value = '';
    document.getElementById('issue-severity').value = 'MEDIUM';
    openModal('modal-issue');
});

document.getElementById('save-issue-btn').addEventListener('click', async () => {
    const title = document.getElementById('issue-title').value.trim();
    if (!title) { toast('Validation', 'Issue title is required.', 'warning'); return; }
    try {
        await API.createIssue(currentIssueProjectId, {
            title,
            description: document.getElementById('issue-description').value,
            category: document.getElementById('issue-category').value,
            severity: document.getElementById('issue-severity').value,
            reportedBy: currentUser?.username
        });
        toast('Issue Reported', `"${title}" has been logged.`, 'success');
        closeModal('modal-issue');
        renderIssues();
        updateIssuesBadge();
    } catch (e) { toast('Error', 'Failed to report issue.', 'error'); }
});

async function resolveIssue(id) {
    try {
        await API.updateIssueStatus(id, 'RESOLVED');
        toast('Resolved', 'Issue marked as resolved.', 'success');
        renderIssues();
        updateIssuesBadge();
    } catch { toast('Error', 'Could not resolve issue.', 'error'); }
}

// ============================================================
// 3D GALLERY
// ============================================================
async function loadGalleryView() {
    try {
        projectsData = await API.getProjects();
        const sel = document.getElementById('gallery-project-filter');
        sel.innerHTML = '<option value="">— Select Project —</option>';
        projectsData.forEach(p => sel.innerHTML += `<option value="${p.id}">${p.name}</option>`);
        if (projectsData.length > 0) sel.value = projectsData[0].id;
        sel.onchange = () => renderGallery(sel.value);
        if (sel.value) renderGallery(sel.value);
    } catch { }
}

function renderGallery(projectId) {
    if (!projectId) {
        document.getElementById('gallery-container').classList.add('hidden');
        document.getElementById('gallery-empty-state').classList.remove('hidden');
        return;
    }
    const p = projectsData.find(x => x.id == projectId);
    document.getElementById('gallery-container').classList.remove('hidden');
    document.getElementById('gallery-empty-state').classList.add('hidden');
    document.getElementById('gallery-project-name').innerText = p?.name || 'Project';

    const pId = parseInt(projectId);
    const imgPath = pId === 1 ? 'images/project_1_mockup.png' : 'images/project_2_mockup.png';
    const fallback = 'https://images.unsplash.com/photo-1541888081622-4a00cb10901e?q=80&w=1200&auto=format&fit=crop';
    const imgEl = document.getElementById('gallery-image');
    imgEl.src = imgPath;
    imgEl.onerror = function () { this.src = fallback; this.onerror = null; };
}

// ============================================================
// USER MANAGEMENT
// ============================================================
async function loadUsersView() {
    const tbody = document.getElementById('users-table-body');
    tbody.innerHTML = `<tr><td colspan="5" class="text-center"><span class="skeleton skeleton-text" style="margin:auto;"></span></td></tr>`;
    try {
        const users = await fetchAPI('/api/users').catch(() => []);
        tbody.innerHTML = '';
        if (!users || users.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted" style="padding:2rem;">No users found.</td></tr>`;
            return;
        }
        users.forEach((u, i) => {
            const roleName = (u.role || 'VIEWER').replace('ROLE_', '').replace('_', ' ');
            tbody.innerHTML += `<tr>
                <td>${i + 1}</td>
                <td><strong>${u.username}</strong></td>
                <td>${u.name || '—'}</td>
                <td><span class="role-pill role-${(u.role || '').replace('ROLE_', '')}">${roleName}</span></td>
                <td><button class="btn btn-secondary btn-sm" onclick="toast('Coming Soon','Role editing coming in next release.','info')"><i class='bx bx-edit'></i> Edit Role</button></td>
            </tr>`;
        });
    } catch (e) { toast('Error', 'Failed to load users. Admin access required.', 'error'); }
}

// ============================================================
// CSV EXPORT UTILITIES
// ============================================================
function downloadCSV(rows, filename) {
    const csvContent = rows.map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    toast('Export', `${filename} downloaded.`, 'success');
}

async function exportProjectsCSV() {
    const rows = [['Name', 'Status', 'Budget', 'Completion%', 'Start', 'End', 'Health']];
    projectsData.forEach(p => rows.push([p.name, p.status, p.budget, Math.round(p.completionPercentage || 0), p.startDate || '', p.endDate || '', p.healthScore || '']));
    downloadCSV(rows, 'civiltrack_projects.csv');
}

async function exportTasksCSV() {
    if (!currentTaskProjectId) { toast('Select Project', 'Please select a project first.', 'warning'); return; }
    const tasks = await API.getTasks(currentTaskProjectId).catch(() => []);
    const rows = [['Task Name', 'Status', 'Progress%', 'Start', 'End', 'Est Cost', 'Actual Cost']];
    tasks.forEach(t => rows.push([t.name, t.status, t.progress || 0, t.startDate || '', t.endDate || '', t.estimatedCost || 0, t.actualCost || 0]));
    downloadCSV(rows, 'civiltrack_tasks.csv');
}

async function exportResourcesCSV() {
    const sel = document.getElementById('resource-project-filter');
    if (!sel.value) { toast('Select Project', 'Select a project first.', 'warning'); return; }
    const [labor, materials] = await Promise.all([API.getLaborForce(sel.value).catch(() => []), API.getMaterials(sel.value).catch(() => [])]);
    const rows = [['Type', 'Count', 'Daily Wage', 'Days', 'Total Paid']];
    labor.forEach(l => rows.push([l.workerType, l.count, l.dailyWage, l.daysWorked, l.totalPaid]));
    rows.push([]);
    rows.push(['Material', 'Available', 'Daily Use', 'Refill Date']);
    materials.forEach(m => rows.push([m.name, m.totalAvailable, m.dailyConsumptionRate, m.refillDateTarget || '']));
    downloadCSV(rows, 'civiltrack_resources.csv');
}

async function exportIssuesCSV() {
    if (!currentIssueProjectId) { toast('Select Project', 'Select a project first.', 'warning'); return; }
    const issues = await API.getIssues(currentIssueProjectId).catch(() => []);
    const rows = [['Title', 'Category', 'Severity', 'Status', 'Reported By', 'Date']];
    issues.forEach(i => rows.push([i.title, i.category, i.severity, i.status, i.reportedBy || '', i.createdAt || '']));
    downloadCSV(rows, 'civiltrack_issues.csv');
}

async function exportAnalyticsCSV() {
    const rows = [['Project', 'Budget', 'Spent', 'Tasks', 'Completion%', 'Health']];
    projectsData.forEach(p => {
        const spent = (p.tasks || []).reduce((a, t) => a + (t.actualCost || 0), 0);
        rows.push([p.name, p.budget || 0, spent, (p.tasks || []).length, Math.round(p.completionPercentage || 0), p.healthScore || '']);
    });
    downloadCSV(rows, 'civiltrack_analytics.csv');
}

// ============================================================
// INIT
// ============================================================
initApp();

// ============================================================
// MATERIAL GRADES & INVENTORY
// ============================================================
const CEMENT_GRADES = [
    {
        id: 'opc33', name: 'OPC 33', full: 'Ordinary Portland Cement (33 Grade)', color: '#3b82f6',
        strength: '33 MPa (28-day)', fineness: '225 m²/kg min', setting: 'Initial: 30 min | Final: 600 min',
        uses: 'Plain concrete, mortar, plaster, general masonry', notes: 'Lowest strength OPC; economical for low-stress work.', category: 'cement'
    },
    {
        id: 'opc43', name: 'OPC 43', full: 'Ordinary Portland Cement (43 Grade)', color: '#6366f1',
        strength: '43 MPa (28-day)', fineness: '225 m²/kg min', setting: 'Initial: 30 min | Final: 600 min',
        uses: 'RCC, precast elements, bridges, roads, multi-storey buildings', notes: 'Most commonly used grade in India for structural work.', category: 'cement'
    },
    {
        id: 'opc53', name: 'OPC 53', full: 'Ordinary Portland Cement (53 Grade)', color: '#8b5cf6',
        strength: '53 MPa (28-day)', fineness: '225 m²/kg min', setting: 'Initial: 30 min | Final: 600 min',
        uses: 'High-rise structures, prestressed concrete, heavy industrial floors', notes: 'High early strength; generates more heat of hydration.', category: 'cement'
    },
    {
        id: 'ppc', name: 'PPC', full: 'Portland Pozzolana Cement', color: '#10b981',
        strength: '33 MPa (28-day)', fineness: '300 m²/kg min', setting: 'Initial: 30 min | Final: 600 min',
        uses: 'Marine works, sewage works, dam foundations, mass concrete', notes: 'Fly ash blended; lower heat of hydration, better resistance to sulphates and chlorides.', category: 'cement'
    },
    {
        id: 'psc', name: 'PSC', full: 'Portland Slag Cement', color: '#14b8a6',
        strength: '33 MPa (28-day)', fineness: '250 m²/kg min', setting: 'Initial: 30 min | Final: 600 min',
        uses: 'Underground structures, coastal/marine works, sewage treatment plants', notes: 'GGBS blended; excellent sulphate resistance and durability.', category: 'cement'
    },
    {
        id: 'src', name: 'SRC', full: 'Sulphate Resistant Cement', color: '#f59e0b',
        strength: '33 MPa (28-day)', fineness: '225 m²/kg min', setting: 'Initial: 30 min | Final: 600 min',
        uses: 'Foundations in sulphate-bearing soils, sewage works, coastal piers', notes: 'Low C3A content; specifically engineered to resist sulphate attack.', category: 'cement'
    },
    {
        id: 'rhc', name: 'RHC', full: 'Rapid Hardening Cement', color: '#ef4444',
        strength: '27 MPa (3-day)', fineness: '325 m²/kg min', setting: 'Initial: 30 min | Final: 600 min',
        uses: 'Road repairs, precast concrete, cold weather concreting', notes: 'Gains strength faster than OPC 53; more expensive.', category: 'cement'
    },
    {
        id: 'lhc', name: 'LHC', full: 'Low Heat Cement', color: '#84cc16',
        strength: '35 MPa (28-day)', fineness: '250 m²/kg min', setting: 'Initial: 60 min | Final: 600 min',
        uses: 'Mass concrete, gravity dams, thick foundations', notes: 'Very low heat of hydration; prevents thermal cracking in large pours.', category: 'cement'
    },
];

const STEEL_GRADES = [
    {
        id: 'fe250', name: 'Fe 250', full: 'Mild Steel (MS) – IS 432', color: '#64748b',
        fy: '250 MPa', fu: '410 MPa', elongation: '23% min', ductility: 'High',
        uses: 'Stirrups, pins, rivets, light structural members', notes: 'Plain (smooth) bars; no ribs. Rarely used for main reinforcement now.', category: 'steel'
    },
    {
        id: 'fe415', name: 'Fe 415', full: 'High Yield Strength Deformed (HYSD) – IS 1786', color: '#3b82f6',
        fy: '415 MPa', fu: '485 MPa', elongation: '14.5% min', ductility: 'Good',
        uses: 'Slabs, beams, columns in normal residential/commercial RCC', notes: 'Most widely used grade in India. Good weldability and ductility.', category: 'steel'
    },
    {
        id: 'fe500', name: 'Fe 500', full: 'High Strength Deformed – IS 1786', color: '#8b5cf6',
        fy: '500 MPa', fu: '545 MPa', elongation: '12% min', ductility: 'Moderate',
        uses: 'High-rise structures, bridges, industrial buildings', notes: 'Higher strength reduces steel quantity; lower ductility than Fe 415.', category: 'steel'
    },
    {
        id: 'fe500d', name: 'Fe 500D', full: 'High Strength Ductile – IS 1786', color: '#6366f1',
        fy: '500 MPa', fu: '565 MPa', elongation: '16% min', ductility: 'High (Seismic)',
        uses: 'Earthquake-resistant structures in Zones III-V', notes: '"D" denotes superior ductility; mandatory for seismic zones per IS 13920.', category: 'steel'
    },
    {
        id: 'fe550', name: 'Fe 550', full: 'Ultra High Strength – IS 1786', color: '#ec4899',
        fy: '550 MPa', fu: '585 MPa', elongation: '10% min', ductility: 'Moderate',
        uses: 'Very high-rise buildings, prestressed elements, heavy foundations', notes: 'Maximum strength; least ductile; use only with detailed seismic analysis.', category: 'steel'
    },
    {
        id: 'fe550d', name: 'Fe 550D', full: 'Ultra High Strength Ductile – IS 1786', color: '#f43f5e',
        fy: '550 MPa', fu: '600 MPa', elongation: '14.5% min', ductility: 'High (Seismic)',
        uses: 'Premium seismic zones, mega structures', notes: 'Best of both worlds – maximum strength + seismic ductility.', category: 'steel'
    },
];

const AGGREGATE_GRADES = [
    {
        id: 'fa', 'name': 'Fine Aggregate (Zone I)', full: 'River Sand / Quarry Dust – Coarse', color: '#f59e0b',
        size: '600μm – 75μm (coarser)', fm: 'Above 3.5', grading: 'Zone I (IS 383)',
        uses: 'Mortar, plaster, concrete in lean mixes', notes: 'Coarsest fine aggregate; provides good workability but may need excess water.', category: 'aggregate'
    },
    {
        id: 'fb', 'name': 'Fine Aggregate (Zone II)', full: 'River Sand – Standard', color: '#f97316',
        size: '600μm – 75μm (medium)', fm: '3.0 – 3.5', grading: 'Zone II (IS 383)',
        uses: 'General concrete (M15–M25), plastering', notes: 'Most preferred sand for standard construction in India.', category: 'aggregate'
    },
    {
        id: 'fc', 'name': 'Fine Aggregate (Zone III)', full: 'River Sand – Fine', color: '#fb923c',
        size: '600μm – 75μm (finer)', fm: '2.3 – 2.9', grading: 'Zone III (IS 383)',
        uses: 'Plastering, rendering, M20 concrete with care', notes: 'Requires water-cement ratio adjustment; prone to segregation.', category: 'aggregate'
    },
    {
        id: 'ca20', 'name': 'CA 20mm', full: 'Coarse Aggregate – 20mm Crushed Stone', color: '#94a3b8',
        size: '20mm nominal max', fm: '6.0 – 7.5', grading: 'Graded (IS 383)',
        uses: 'RCC slabs, beams, columns, general structural concrete', notes: 'Standard size for most RCC work. Good packing and strength.', category: 'aggregate'
    },
    {
        id: 'ca40', 'name': 'CA 40mm', full: 'Coarse Aggregate – 40mm Crushed Stone', color: '#64748b',
        size: '40mm nominal max', fm: '7.5 – 8.5', grading: 'Graded (IS 383)',
        uses: 'Mass concrete, dams, road sub-base, footings', notes: 'Less cement paste needed; economical; not suitable for thin sections.', category: 'aggregate'
    },
    {
        id: 'ca10', 'name': 'CA 10mm', full: 'Coarse Aggregate – 10mm Pea Gravel', color: '#a8a29e',
        size: '10mm nominal max', fm: '5.0 – 6.0', grading: 'Graded (IS 383)',
        uses: 'Thin slabs, precast panels, self-compacting concrete', notes: 'Small particle size for congested reinforcement sections.', category: 'aggregate'
    },
];

let inventoryData = JSON.parse(localStorage.getItem('civiltrack_inventory') || '{}');
let currentMGTab = 'cement-grades';

function loadMaterialGrades() {
    renderGradeCards('cement-grade-cards', CEMENT_GRADES, renderCementCard);
    renderGradeCards('steel-grade-cards', STEEL_GRADES, renderSteelCard);
    renderGradeCards('aggregate-grade-cards', AGGREGATE_GRADES, renderAggregateCard);
    renderInventoryTable();
    document.getElementById('inv-category').onchange = renderInventoryTable;
}

function renderGradeCards(containerId, data, renderFn) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = data.map(renderFn).join('');
}

function renderCementCard(g) {
    const inv = inventoryData[g.id] || 0;
    const status = inv === 0 ? 'inv-none' : inv < 100 ? 'inv-low' : 'inv-ok';
    return `<div class="grade-card glass-card">
        <div class="grade-header" style="border-left:4px solid ${g.color};">
            <span class="grade-badge" style="background:${g.color}20;color:${g.color};">${g.name}</span>
            <span class="inv-pill ${status}">${inv > 0 ? inv + ' bags' : 'No Stock'}</span>
        </div>
        <div class="grade-full-name">${g.full}</div>
        <div class="grade-props">
            <div class="grade-prop"><span>28-day Strength</span><strong>${g.strength}</strong></div>
            <div class="grade-prop"><span>Initial Setting</span><strong>${g.setting.split('|')[0]}</strong></div>
            <div class="grade-prop"><span>Best Use</span><strong>${g.uses.split(',')[0]}</strong></div>
        </div>
        <div class="grade-note">${g.notes}</div>
    </div>`;
}

function renderSteelCard(g) {
    const inv = inventoryData[g.id] || 0;
    const status = inv === 0 ? 'inv-none' : inv < 500 ? 'inv-low' : 'inv-ok';
    return `<div class="grade-card glass-card">
        <div class="grade-header" style="border-left:4px solid ${g.color};">
            <span class="grade-badge" style="background:${g.color}20;color:${g.color};">${g.name}</span>
            <span class="inv-pill ${status}">${inv > 0 ? inv + ' kg' : 'No Stock'}</span>
        </div>
        <div class="grade-full-name">${g.full}</div>
        <div class="grade-props">
            <div class="grade-prop"><span>Yield Strength (fy)</span><strong>${g.fy}</strong></div>
            <div class="grade-prop"><span>Ultimate (fu)</span><strong>${g.fu}</strong></div>
            <div class="grade-prop"><span>Ductility</span><strong>${g.ductility}</strong></div>
        </div>
        <div class="grade-note">${g.notes}</div>
    </div>`;
}

function renderAggregateCard(g) {
    const inv = inventoryData[g.id] || 0;
    const status = inv === 0 ? 'inv-none' : inv < 1000 ? 'inv-low' : 'inv-ok';
    return `<div class="grade-card glass-card">
        <div class="grade-header" style="border-left:4px solid ${g.color};">
            <span class="grade-badge" style="background:${g.color}20;color:${g.color};">${g.name}</span>
            <span class="inv-pill ${status}">${inv > 0 ? inv + ' kg' : 'No Stock'}</span>
        </div>
        <div class="grade-full-name">${g.full}</div>
        <div class="grade-props">
            <div class="grade-prop"><span>Size</span><strong>${g.size}</strong></div>
            <div class="grade-prop"><span>Fineness Modulus</span><strong>${g.fm}</strong></div>
            <div class="grade-prop"><span>Grading</span><strong>${g.grading}</strong></div>
        </div>
        <div class="grade-note">${g.notes}</div>
    </div>`;
}

function switchMGTab(btn, tabId) {
    document.querySelectorAll('.mg-tab').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.mg-tab-content').forEach(c => c.classList.add('hidden'));
    btn.classList.add('active');
    document.getElementById(tabId).classList.remove('hidden');
    currentMGTab = tabId;
    if (tabId === 'inventory-panel') renderInventoryTable();
}

function renderInventoryTable() {
    const cat = document.getElementById('inv-category')?.value || 'all';
    let items = [];
    if (cat === 'all' || cat === 'cement') items = items.concat(CEMENT_GRADES.map(g => ({ ...g, unit: 'bags' })));
    if (cat === 'all' || cat === 'steel') items = items.concat(STEEL_GRADES.map(g => ({ ...g, unit: 'kg' })));
    if (cat === 'all' || cat === 'aggregate') items = items.concat(AGGREGATE_GRADES.map(g => ({ ...g, unit: 'kg' })));

    const wrapper = document.getElementById('inventory-table-wrapper');
    if (!wrapper) return;
    let rows = items.map(g => {
        const qty = inventoryData[g.id] || 0;
        const isLow = qty < (g.category === 'cement' ? 100 : g.category === 'steel' ? 500 : 1000);
        const indicator = qty === 0 ? '🔴' : isLow ? '🟡' : '🟢';
        return `<tr>
            <td>${indicator} <strong>${g.name}</strong></td>
            <td><small style="color:var(--text-muted)">${g.full}</small></td>
            <td><span class="badge" style="background:${g.color}22;color:${g.color};">${g.category}</span></td>
            <td><input type="number" class="inv-qty-input" data-id="${g.id}" value="${qty}" min="0" style="width:100px;"></td>
            <td>${g.unit}</td>
            <td>${qty === 0 ? '<span style="color:var(--accent-danger)">Out of Stock</span>' : isLow ? '<span style="color:var(--accent-warning)">Low Stock</span>' : '<span style="color:var(--accent-success)">Sufficient</span>'}</td>
        </tr>`;
    }).join('');

    wrapper.innerHTML = `<table class="data-table"><thead><tr><th>Grade</th><th>Full Name</th><th>Category</th><th>Qty Available</th><th>Unit</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table>`;

    // Summary
    const sumEl = document.getElementById('inv-summary');
    if (sumEl) {
        const outOfStock = items.filter(g => (inventoryData[g.id] || 0) === 0).length;
        const lowStock = items.filter(g => { const q = inventoryData[g.id] || 0; return q > 0 && q < (g.category === 'cement' ? 100 : g.category === 'steel' ? 500 : 1000); }).length;
        const ok = items.length - outOfStock - lowStock;
        sumEl.innerHTML = `
            <div class="stat-card glass-card"><div class="stat-icon bg-green"><i class='bx bx-check-circle'></i></div><div class="stat-details"><h3>Sufficient</h3><h2>${ok}</h2></div></div>
            <div class="stat-card glass-card"><div class="stat-icon bg-orange"><i class='bx bx-error'></i></div><div class="stat-details"><h3>Low Stock</h3><h2>${lowStock}</h2></div></div>
            <div class="stat-card glass-card"><div class="stat-icon bg-red"><i class='bx bx-x-circle'></i></div><div class="stat-details"><h3>Out of Stock</h3><h2>${outOfStock}</h2></div></div>
        `;
    }
}

function saveInventory() {
    document.querySelectorAll('.inv-qty-input').forEach(input => {
        inventoryData[input.dataset.id] = parseFloat(input.value) || 0;
    });
    localStorage.setItem('civiltrack_inventory', JSON.stringify(inventoryData));
    toast('Saved', 'Inventory updated successfully.', 'success');
    loadMaterialGrades();
}

// ============================================================
// AI CONSTRUCTION DECISION ENGINE  (Powered by AI)
// ============================================================
function initAIDecisions() {
    // Add AI Q&A panel if not already present
    const out = document.getElementById('ai-output-panel');
    if (out && !document.getElementById('ai-chat-section')) {
        const chatSection = document.createElement('div');
        chatSection.id = 'ai-chat-section';
        chatSection.className = 'glass-card';
        chatSection.style.cssText = 'padding:1.2rem;margin-top:1.2rem;';
        chatSection.innerHTML = `
            <div style="display:flex;align-items:center;gap:0.6rem;margin-bottom:0.8rem;">
                <h3 style="margin:0;">Ask the Construction AI</h3>
            </div>
            <p style="font-size:0.8rem;color:var(--text-muted);margin-bottom:0.8rem;">Ask any construction question — cement mix design, structural queries, site safety, IS code references, and more.</p>
            <div style="display:flex;gap:0.5rem;">
                <input type="text" id="ai-question-input" placeholder="e.g. What is the minimum cover for RCC columns in coastal areas?" style="flex:1;">
                <button class="btn btn-primary btn-sm" onclick="askAIConstruction()" id="ai-ask-btn"><i class='bx bx-send'></i> Ask</button>
            </div>
            <div id="ai-answer" class="ai-chat-box hidden"></div>
        `;
        out.appendChild(chatSection);
    }
}

async function runAIDecision() {
    const btn = document.getElementById('ai-analyze-btn');
    btn.innerHTML = `<i class='bx bx-loader-alt bx-spin'></i> AI Analyzing...`;
    btn.disabled = true;

    const p = {
        type: document.getElementById('ai-project-type').value,
        exposure: document.getElementById('ai-exposure').value,
        strength: parseInt(document.getElementById('ai-strength').value) || 25,
        seismic: parseInt(document.getElementById('ai-seismic').value) || 3,
        member: document.getElementById('ai-member').value,
        temp: parseInt(document.getElementById('ai-temp').value) || 30,
        curing: document.getElementById('ai-curing').value,
        floor: parseInt(document.getElementById('ai-floor').value) || 1,
        sulphate: document.getElementById('ai-sulphate').value,
        budget: document.getElementById('ai-budget-priority').value,
    };

    const prompt = `You are a senior structural and civil engineer in India. Based on these project parameters, give construction material and method recommendations strictly following IS codes (IS 456, IS 1786, IS 13920, IS 383).

Project Parameters:
- Project Type: ${p.type}
- Exposure Condition: ${p.exposure}
- Required Concrete Strength: ${p.strength} MPa
- Seismic Zone: ${p.seismic}
- Structural Member: ${p.member}
- Site Temperature: ${p.temp}°C
- Curing Method: ${p.curing}
- Building Floor No.: ${p.floor}
- Sulphate in Soil/Water: ${p.sulphate}
- Budget Priority: ${p.budget}

Respond ONLY with a valid JSON object (no markdown, no code blocks) with exactly these keys:
{
  "cement": "recommended cement type name",
  "cementReason": "why this cement",
  "mix": "concrete mix grade e.g. M25",
  "mixReason": "why this mix",
  "steel": "recommended steel grade",
  "steelReason": "why this steel",
  "wc": 0.50,
  "wcReason": "IS code basis",
  "curingDays": 14,
  "curingReason": "why this duration",
  "slabInterval": 10,
  "slabReason": "why wait this many days before casting next slab",
  "fw": "formwork removal timeline",
  "admixture": "recommended admixture or None",
  "admixReason": "why this admixture"
}`;

    try {
        const raw = await callAI(prompt, { json: true });
        const rec = JSON.parse(raw);
        renderAIResults(rec);
        toast('Smart Assistant', 'Recommendations generated using AI.', 'success');
    } catch (err) {
        console.warn('AI API failed, falling back to rule-based engine:', err);
        const rec = computeAIDecisions(p);
        renderAIResults(rec);
        toast('Offline Mode', 'Using rule-based engine (AI unavailable).', 'warning');
    }

    btn.innerHTML = `<i class='bx bx-analyse'></i> Generate Recommendations`;
    btn.disabled = false;
}

async function askAIConstruction() {
    const input = document.getElementById('ai-question-input');
    const answerBox = document.getElementById('ai-answer');
    const btn = document.getElementById('ai-ask-btn');
    const question = input.value.trim();
    if (!question) { toast('Empty', 'Please enter a question.', 'warning'); return; }

    btn.innerHTML = `<i class='bx bx-loader-alt bx-spin'></i>`;
    btn.disabled = true;
    answerBox.classList.remove('hidden');
    answerBox.textContent = 'AI is thinking...';

    const prompt = `You are an expert civil and structural engineer in India with deep knowledge of IS codes, construction materials, site practices, and sustainability. Answer the following question concisely but thoroughly:

"${question}"

Provide practical advice, IS code references where relevant, and keep the answer clear and actionable for a site engineer.`;

    try {
        const answer = await callAI(prompt);
        answerBox.textContent = answer;
    } catch (err) {
        answerBox.textContent = 'Could not reach AI API. Please check your internet connection.';
    }
    btn.innerHTML = `<i class='bx bx-send'></i> Ask`;
    btn.disabled = false;
}

function computeAIDecisions(p) {
    // --- Cement Type ---
    let cement, cementReason;
    if (p.sulphate === 'heavy' || p.sulphate === 'moderate') {
        cement = 'SRC (Sulphate Resistant Cement)'; cementReason = 'Sulphate present in soil/water — SRC has minimal C3A content to resist attack.';
    } else if (p.exposure === 'severe' || p.exposure === 'v_severe') {
        cement = 'PSC or PPC'; cementReason = 'Severe/Very Severe exposure requires blended cement for better durability and lower permeability.';
    } else if (p.type === 'dam' || p.member === 'footing') {
        cement = 'LHC or PPC'; cementReason = 'Mass concrete pour — Low Heat or PPC minimises thermal cracking.';
    } else if (p.strength >= 40 || p.type === 'bridge') {
        cement = 'OPC 53'; cementReason = `High strength (${p.strength} MPa) required — OPC 53 provides maximum early and 28-day strength.`;
    } else if (p.strength >= 30) {
        cement = 'OPC 43 or OPC 53'; cementReason = `Moderate-high strength (${p.strength} MPa) — OPC 43 is sufficient; OPC 53 if faster progress needed.`;
    } else if (p.budget === 'low_cost') {
        cement = 'PPC (Portland Pozzolana Cement)'; cementReason = 'Low-cost priority + mild/moderate exposure — PPC is economical and eco-friendly.';
    } else {
        cement = 'OPC 43'; cementReason = 'Standard general-purpose grade suitable for typical residential/commercial RCC work.';
    }

    // --- Concrete Mix Grade ---
    let mix, mixReason;
    if (p.strength >= 50) { mix = 'M50 (Design Mix)'; mixReason = 'Very high strength → specialist mix design required.'; }
    else if (p.strength >= 40) { mix = 'M40 (Design Mix)'; mixReason = 'High strength structural requirement.'; }
    else if (p.strength >= 30) { mix = 'M30'; mixReason = 'Structural concrete for bridges, heavy RCC.'; }
    else if (p.strength >= 25) { mix = 'M25'; mixReason = 'Standard RCC slabs, beams, columns in commercial buildings.'; }
    else if (p.strength >= 20) { mix = 'M20'; mixReason = 'Common residential building RCC grade.'; }
    else { mix = 'M15'; mixReason = 'Plain concrete, levelling course, lean mix applications.'; }

    // --- Steel Grade ---
    let steel, steelReason;
    if (p.seismic >= 4) { steel = 'Fe 500D or Fe 550D'; steelReason = `Seismic Zone ${p.seismic} (High/Very High) — "D" suffix ensures superior ductility per IS 13920.`; }
    else if (p.seismic === 3 && (p.type === 'commercial' || p.type === 'bridge')) { steel = 'Fe 500D'; steelReason = 'Moderate seismic zone + critical structure — ductile grade recommended.'; }
    else if (p.strength >= 35 || p.type === 'bridge' || p.type === 'industrial') { steel = 'Fe 500'; steelReason = 'High-strength concrete pair — Fe 500 provides balanced strength with adequate ductility.'; }
    else if (p.member === 'stirrup') { steel = 'Fe 250 (Mild Steel)'; steelReason = 'Stirrups/ties benefit from plain mild steel for easy bending.'; }
    else { steel = 'Fe 415'; steelReason = 'Standard HYSD grade — most widely used for normal residential/commercial RCC.'; }

    // --- Water-Cement Ratio ---
    const wcMap = { mild: 0.55, moderate: 0.50, severe: 0.45, v_severe: 0.40, extreme: 0.38 };
    const wc = wcMap[p.exposure] || 0.50;
    const wcReason = `IS 456 Table 5 limit for ${p.exposure.replace('_', ' ')} exposure. Lower W/C = lower permeability.`;

    // --- Curing Period ---
    let curingDays, curingReason;
    const curingBase = { OPC: 7, PPC: 14, PSC: 14, SRC: 7, LHC: 14, RHC: 3 };
    const baseDays = cement.includes('PPC') || cement.includes('PSC') || cement.includes('LHC') ? 14 : cement.includes('RHC') ? 3 : 7;
    if (p.temp > 40) { curingDays = baseDays + 3; curingReason = `High temperature (${p.temp}°C) increases evaporation — extend curing by 3 days.`; }
    else if (p.temp < 15) { curingDays = baseDays + 4; curingReason = `Low temperature (${p.temp}°C) slows hydration — extend curing by 4 days.`; }
    else { curingDays = baseDays; curingReason = 'IS 456 minimum curing days for selected cement type.'; }

    // --- Slab Interval (days before casting next slab) ---
    let slabInterval, slabReason;
    const basInterval = cement.includes('RHC') ? 3 : cement.includes('OPC 53') ? 7 : 10;
    const tempAdj = p.temp > 35 ? +2 : p.temp < 20 ? +3 : 0;
    const floorAdj = p.floor > 10 ? +2 : p.floor > 5 ? +1 : 0;
    slabInterval = basInterval + tempAdj + floorAdj;
    slabReason = `Base: ${basInterval}d (${cement.split(' ')[0]}). Temp adj: +${tempAdj}d. Height adj: +${floorAdj}d. Minimum strength criterion: achieve 70% of fck before loading next floor.`;

    // --- Formwork Removal ---
    const fwMap = { slab: 'Sides 24h | Soffit props: 14 days (M20) / 10 days (M25+)', beam: 'Sides 48h | Bottom formwork: 21 days (≤6m span)', column: '24–48 hours after casting', footing: '24–36 hours after casting', shear_wall: '24–48 hours (sides only)', retaining: '48–72 hours' };
    const fw = fwMap[p.member] || '24–48 hours';

    // --- Admixture ---
    let admixture, admixReason;
    if (p.temp > 38) { admixture = 'Retarder (e.g. Conplast R)'; admixReason = `Site temperature ${p.temp}°C — retarder extends workability and prevents flash set.`; }
    else if (p.temp < 15) { admixture = 'Accelerator (e.g. Sika Rapid)'; admixReason = `Cold temperature (${p.temp}°C) — accelerator boosts early strength gain.`; }
    else if (wc <= 0.42) { admixture = 'Superplasticizer (PCE type)'; admixReason = 'Very low W/C ratio — superplasticizer restores workability without adding water.'; }
    else if (p.budget === 'high_performance') { admixture = 'High-Range Water Reducer (HRWR)'; admixReason = 'High performance priority — HRWR maximises strength at minimal W/C.'; }
    else { admixture = 'Normal Plasticizer (MLS type) – Optional'; admixReason = 'No extreme conditions detected. Plasticizer optional for improved workability.'; }

    return { cement, cementReason, mix, mixReason, steel, steelReason, wc, wcReason, curingDays, curingReason, slabInterval, slabReason, fw, admixture, admixReason };
}

function renderAIResults(r) {
    document.getElementById('ai-placeholder').classList.add('hidden');
    const el = document.getElementById('ai-results');
    el.classList.remove('hidden');
    el.innerHTML = `
        <div class="ai-results-header glass-card" style="margin-bottom:1.2rem;padding:1rem;display:flex;align-items:center;gap:0.8rem;">
            <i class='bx bx-check-circle' style="font-size:1.8rem;color:var(--accent-success);"></i>
            <div><h3 style="margin:0;">Recommendations Generated</h3><p style="color:var(--text-muted);font-size:0.8rem;margin:0;">Based on your project parameters — AI Decision Engine v1.0</p></div>
        </div>
        <div class="ai-cards-grid">
            ${aiCard('bx-buildings', 'Cement Type', r.cement, '#3b82f6', r.cementReason)}
            ${aiCard('bx-shape-triangle', 'Concrete Grade', r.mix, '#8b5cf6', r.mixReason)}
            ${aiCard('bx-layer-double-minus', 'Steel Grade', r.steel, '#ec4899', r.steelReason)}
            ${aiCard('bx-droplet', 'Water-Cement Ratio', 'W/C ≤ ' + r.wc, '#06b6d4', r.wcReason)}
            ${aiCard('bx-time', 'Curing Period', r.curingDays + ' Days', '#10b981', r.curingReason)}
            ${aiCard('bx-home-circle', 'Next Slab After', r.slabInterval + ' Days', '#f59e0b', r.slabReason)}
            ${aiCard('bx-minus-circle', 'Formwork Removal', r.fw, '#64748b', 'As per IS 456 Table 11. Always verify actual strength before removal.')}
            ${aiCard('bx-flask', 'Admixture', r.admixture, '#14b8a6', r.admixReason)}
        </div>
    `;
}

function aiCard(icon, title, value, color, reason) {
    return `<div class="ai-result-card glass-card">
        <div style="display:flex;align-items:center;gap:0.6rem;margin-bottom:0.5rem;">
            <i class='bx ${icon}' style="font-size:1.3rem;color:${color};"></i>
            <span style="font-size:0.75rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.05em;">${title}</span>
        </div>
        <div style="font-size:1rem;font-weight:700;color:var(--text-primary);margin-bottom:0.4rem;">${value}</div>
        <div style="font-size:0.75rem;color:var(--text-muted);line-height:1.5;">${reason}</div>
    </div>`;
}

// ============================================================
// BIO-CEMENT MANUFACTURING LAB
// ============================================================
const BIO_CEMENT_RECIPES = [
    {
        id: 'geopolymer',
        name: 'Fly Ash Geopolymer',
        icon: 'bx-cloud',
        color: '#6366f1',
        type: 'Geopolymer Binder',
        quality: 'M25 – M50 equivalent',
        strength: '30–60 MPa (28-day)',
        curingTime: '24h heat cure at 60–80°C OR 28 days ambient',
        co2Saving: '~80% less CO₂ vs OPC',
        description: 'Fly ash activated with alkali solutions (NaOH + Na₂SiO₃). No OPC used. Excellent heat and acid resistance. Ideal for industrial floors and infrastructure where high chemical resistance is needed.',
        ingredients: [
            { name: 'Fly Ash (Class F or C)', key: 'flyash', ratio: 0.60, unit: 'kg', note: 'ASTM Class F preferred; low calcium for better geopolymerisation' },
            { name: 'Sodium Hydroxide (NaOH 10–14M)', key: 'naoh', ratio: 0.09, unit: 'kg', note: 'Activator; concentration affects strength directly' },
            { name: 'Sodium Silicate (Na₂SiO₃)', key: 'na2sio3', ratio: 0.22, unit: 'kg', note: 'Silica modulus 2.0–2.4; provides silicate networks' },
            { name: 'Water', key: 'water', ratio: 0.06, unit: 'litre', note: 'Minimum water for workability; excess reduces strength' },
            { name: 'Superplasticizer', key: 'sp', ratio: 0.01, unit: 'kg', note: 'Optional: improves placing workability' },
            { name: 'Fine Aggregate (Sand)', key: 'sand', ratio: 1.5, unit: 'kg', note: 'Zone II river sand; relative to binder weight' },
        ],
        tips: ['Heat curing at 60°C for 24h greatly accelerates strength.', 'NaOH solution must be prepared 24h in advance and cooled before mixing.', 'Store fly ash in dry conditions — moisture reduces reactivity.']
    },
    {
        id: 'rha',
        name: 'Rice Husk Ash Cement',
        icon: 'bx-leaf',
        color: '#10b981',
        type: 'Pozzolanic Binder',
        quality: 'M15 – M30 equivalent',
        strength: '20–35 MPa (28-day)',
        curingTime: '28 days water curing',
        co2Saving: '~50% less CO₂ vs OPC',
        description: 'Rice Husk Ash (RHA) is a highly reactive pozzolan obtained by controlled burning of rice husks. Blended with lime and gypsum to produce a hydraulic cement. Best used as 30–40% OPC replacement or standalone for rural/low-load construction.',
        ingredients: [
            { name: 'Rice Husk Ash (RHA)', key: 'rha', ratio: 0.40, unit: 'kg', note: 'Burn at 500–700°C; amorphous silica content >85%' },
            { name: 'Hydrated Lime (Ca(OH)₂)', key: 'lime', ratio: 0.25, unit: 'kg', note: 'Activates pozzolanic reaction with RHA silica' },
            { name: 'Gypsum (CaSO₄·2H₂O)', key: 'gypsum', ratio: 0.05, unit: 'kg', note: 'Controls setting time; ~3–5% of total binder' },
            { name: 'OPC (as activator)', key: 'opc', ratio: 0.10, unit: 'kg', note: 'Small OPC addition boosts early strength significantly' },
            { name: 'Water', key: 'water', ratio: 0.20, unit: 'litre', note: 'W/B ratio ~0.45–0.55 for normal consistency' },
        ],
        tips: ['RHA grinding to specific surface >15,000 cm²/g is critical for reactivity.', 'Avoid using RHA burnt above 800°C — becomes crystalline and non-reactive.', 'Ideal for rural/ low-cost construction where rice husks are locally abundant.']
    },
    {
        id: 'micp',
        name: 'Bacterial MICP Cement',
        icon: 'bx-unite',
        color: '#f59e0b',
        type: 'Bio-mineralisation',
        quality: 'Soil Stabilisation / M10 equivalent',
        strength: '10–20 MPa (calcite cemented)',
        curingTime: '7–14 days (bio-mineralisation)',
        co2Saving: '~60% less CO₂ vs OPC',
        description: 'Microbially Induced Calcite Precipitation (MICP) uses bacteria (Sporosarcina pasteurii) to hydrolyse urea, producing calcite (CaCO₃) crystals that bind soil/aggregate particles. Used in ground improvement, crack healing, and low-strength binders.',
        ingredients: [
            { name: 'Bacterial Culture (S. pasteurii)', key: 'bacteria', ratio: 0.002, unit: 'litre', note: 'OD600 ≈ 1.0; fresh culture prepared 24h before treatment' },
            { name: 'Urea (CH₄N₂O)', key: 'urea', ratio: 0.18, unit: 'kg', note: 'Substrate for urease enzyme; equimolar with CaCl₂' },
            { name: 'Calcium Chloride (CaCl₂)', key: 'cacl2', ratio: 0.20, unit: 'kg', note: 'Calcium source for calcite precipitation' },
            { name: 'Nutrient Broth / Yeast Extract', key: 'nutrients', ratio: 0.005, unit: 'kg', note: 'Keeps bacteria active during treatment cycles' },
            { name: 'Distilled / De-ionised Water', key: 'water', ratio: 0.60, unit: 'litre', note: 'Saline water inhibits bacterial activity; use clean water only' },
        ],
        tips: ['Inject cementation solution in multiple cycles (3–6 cycles) for uniform calcite distribution.', 'Maintain pH 7–9 for maximum bacterial urease activity.', 'MICP is best for sand/gravel ground improvement, crack sealing, and experimental binder applications.']
    },
    {
        id: 'hempcrete',
        name: 'Hemp Lime (Hempcrete)',
        icon: 'bx-spa',
        color: '#84cc16',
        type: 'Non-structural Bio-composite',
        quality: 'Insulation / Low-load Walls',
        strength: '0.5–3.5 MPa (compressive)',
        curingTime: '28 days (carbonation curing)',
        co2Saving: 'Carbon negative (sequesters CO₂)',
        description: 'Hemp hurds (woody inner core of hemp stalk) bound with hydrated lime and water. Carbon-negative material — absorbs CO₂ during carbonation curing. Excellent thermal and acoustic insulation. Not structural but ideal for non-loadbearing partitions, infill walls, and insulation panels.',
        ingredients: [
            { name: 'Hemp Hurds (Shiv)', key: 'hemp', ratio: 0.25, unit: 'kg', note: 'Granule size 10–25mm; must be dry before mixing' },
            { name: 'Hydrated Lime (Binder)', key: 'lime', ratio: 0.50, unit: 'kg', note: 'NHL 3.5 or NHL 5 recommended; standard hydrated lime works too' },
            { name: 'Water', key: 'water', ratio: 0.25, unit: 'litre', note: 'W/B ≈ 0.5; pre-wet hemp hurds to control absorption' },
        ],
        tips: ['Pre-wet hemp hurds for 30 min before mixing to saturate them — prevents water being stolen from lime.', 'Never compact hempcrete; pour loosely into formwork and allow natural settlement.', 'Carbonation curing requires air exposure — do not seal the wall while curing.']
    }
];

let currentBCRecipe = null;

function loadBioCement() {
    const list = document.getElementById('bc-recipe-list');
    list.innerHTML = BIO_CEMENT_RECIPES.map(r => `
        <div class="bc-recipe-item" id="bcr-${r.id}" onclick="selectBCRecipe('${r.id}')">
            <i class='bx ${r.icon}' style="color:${r.color};"></i>
            <div>
                <div style="font-weight:600;">${r.name}</div>
                <div style="font-size:0.75rem;color:var(--text-muted);">${r.type}</div>
            </div>
        </div>
    `).join('');
}

function selectBCRecipe(id) {
    currentBCRecipe = BIO_CEMENT_RECIPES.find(r => r.id === id);
    if (!currentBCRecipe) return;
    document.querySelectorAll('.bc-recipe-item').forEach(el => el.classList.remove('active'));
    document.getElementById('bcr-' + id)?.classList.add('active');
    document.getElementById('bc-placeholder').classList.add('hidden');
    document.getElementById('bc-detail').classList.remove('hidden');

    const r = currentBCRecipe;
    document.getElementById('bc-recipe-card').innerHTML = `
        <div style="display:flex;gap:1rem;flex-wrap:wrap;align-items:flex-start;">
            <div style="flex:1;min-width:220px;">
                <div style="display:flex;align-items:center;gap:0.7rem;margin-bottom:0.8rem;">
                    <i class='bx ${r.icon}' style="font-size:2rem;color:${r.color};"></i>
                    <div>
                        <h2 style="margin:0;">${r.name}</h2>
                        <span class="badge" style="background:${r.color}22;color:${r.color};margin-top:0.2rem;">${r.type}</span>
                    </div>
                </div>
                <p style="color:var(--text-muted);font-size:0.85rem;line-height:1.6;margin-bottom:1rem;">${r.description}</p>
                <div class="bc-spec-grid">
                    <div class="bc-spec"><span>Equivalent Grade</span><strong>${r.quality}</strong></div>
                    <div class="bc-spec"><span>Strength</span><strong>${r.strength}</strong></div>
                    <div class="bc-spec"><span>Curing Time</span><strong>${r.curingTime}</strong></div>
                    <div class="bc-spec"><span>CO₂ Saving</span><strong style="color:#10b981;">${r.co2Saving}</strong></div>
                </div>
            </div>
            <div style="flex:1;min-width:220px;">
                <h4 style="margin-bottom:0.6rem;"><i class='bx bx-list-check'></i> Ingredients (per 1 kg output)</h4>
                <table class="data-table" style="font-size:0.82rem;">
                    <thead><tr><th>Material</th><th>Qty/kg</th><th>Unit</th><th>Note</th></tr></thead>
                    <tbody>${r.ingredients.map(i => `<tr><td><strong>${i.name}</strong></td><td>${i.ratio}</td><td>${i.unit}</td><td style="color:var(--text-muted);font-size:0.75rem;">${i.note}</td></tr>`).join('')}</tbody>
                </table>
                <div style="margin-top:0.8rem;">
                    <h4 style="margin-bottom:0.4rem;"><i class='bx bx-bulb'></i> Pro Tips</h4>
                    ${r.tips.map(t => `<div style="font-size:0.78rem;color:var(--text-muted);margin-bottom:0.3rem;">• ${t}</div>`).join('')}
                </div>
            </div>
        </div>
    `;

    // Populate feasibility inputs
    const fi = document.getElementById('bc-feasibility-inputs');
    fi.innerHTML = `<div class="input-row" style="flex-wrap:wrap;">${r.ingredients.map(ing => `
        <div class="input-group" style="min-width:160px;flex:1;">
            <label>${ing.name}</label>
            <div style="display:flex;gap:0.3rem;align-items:center;">
                <input type="number" id="fi-${ing.key}" class="form-control" placeholder="Available" min="0" step="0.01" style="flex:1;">
                <span style="font-size:0.8rem;color:var(--text-muted);">${ing.unit}</span>
            </div>
        </div>`).join('')}</div>`;

    document.getElementById('bc-calc-result').innerHTML = '';
    document.getElementById('bc-feasibility-result').innerHTML = '';

    // Add AI advice panel for this recipe
    const existingPanel = document.getElementById('bc-ai-panel');
    if (existingPanel) existingPanel.remove();
    const panel = document.createElement('div');
    panel.id = 'bc-ai-panel';
    panel.className = 'glass-card';
    panel.style.cssText = 'margin-top:1.2rem;padding:1.2rem;';
    panel.innerHTML = `
        <div style="display:flex;align-items:center;gap:0.6rem;margin-bottom:0.8rem;">
            <h3 style="margin:0;">Bio-Cement AI Advisor</h3>
        </div>
        <p style="font-size:0.8rem;color:var(--text-muted);margin-bottom:0.8rem;">Ask the AI anything about this bio-cement type — production, quality control, alternatives, environmental impact, and more.</p>
        <div style="display:flex;gap:0.5rem;margin-bottom:0.5rem;flex-wrap:wrap;">
            <button class="btn btn-secondary btn-sm" onclick="askBCQuestion('What quality tests should I perform on ${r.name} before use?')" id="bc-q-btn-1"><i class='bx bx-test-tube'></i> Quality Tests</button>
            <button class="btn btn-secondary btn-sm" onclick="askBCQuestion('What are the storage requirements for ${r.name} ingredients?')" id="bc-q-btn-2"><i class='bx bx-package'></i> Storage Guide</button>
            <button class="btn btn-secondary btn-sm" onclick="askBCQuestion('What are common production failures in ${r.name} and how to fix them?')" id="bc-q-btn-3"><i class='bx bx-wrench'></i> Troubleshoot</button>
            <button class="btn btn-secondary btn-sm" onclick="askBCQuestion('Compare ${r.name} with OPC cement in terms of strength, cost and sustainability.')" id="bc-q-btn-4"><i class='bx bx-bar-chart'></i> vs OPC</button>
        </div>
        <div style="display:flex;gap:0.5rem;">
            <input type="text" id="bc-question-input" placeholder="Ask anything about ${r.name}..." style="flex:1;">
            <button class="btn btn-primary btn-sm" onclick="askBCQuestion()" id="bc-ask-btn"><i class='bx bx-send'></i> Ask</button>
        </div>
        <div id="bc-ai-answer" class="ai-chat-box hidden"></div>
    `;
    document.getElementById('bc-detail').appendChild(panel);

    // Auto-load an introduction from AI
    askBCQuestion(`Give me a brief expert introduction to ${r.name} (${r.type}): what it is, its main advantage, and the single most important thing to get right during production. Keep it under 120 words.`, true);
}

function calculateBatchQuantities() {
    if (!currentBCRecipe) return;
    const targetKg = parseFloat(document.getElementById('bc-target-kg').value) || 1000;
    const batches = parseInt(document.getElementById('bc-batches').value) || 1;
    const totalKg = targetKg * batches;
    const r = currentBCRecipe;

    const rows = r.ingredients.map(ing => {
        const totalQty = (ing.ratio * totalKg).toFixed(2);
        const perBatch = (ing.ratio * targetKg).toFixed(2);
        return `<tr><td><strong>${ing.name}</strong></td><td>${perBatch} ${ing.unit}</td><td>${totalQty} ${ing.unit}</td></tr>`;
    }).join('');

    document.getElementById('bc-calc-result').innerHTML = `
        <div style="background:var(--card-bg);border-radius:8px;padding:0.8rem;">
            <div style="display:flex;gap:1.5rem;margin-bottom:0.8rem;flex-wrap:wrap;">
                <div><span style="color:var(--text-muted);font-size:0.78rem;">Total Output</span><br><strong style="font-size:1.1rem;">${totalKg.toLocaleString()} kg</strong></div>
                <div><span style="color:var(--text-muted);font-size:0.78rem;">Batches</span><br><strong style="font-size:1.1rem;">${batches}</strong></div>
                <div><span style="color:var(--text-muted);font-size:0.78rem;">Per Batch</span><br><strong style="font-size:1.1rem;">${targetKg} kg</strong></div>
            </div>
            <table class="data-table" style="font-size:0.82rem;">
                <thead><tr><th>Ingredient</th><th>Per Batch</th><th>Total (All Batches)</th></tr></thead>
                <tbody>${rows}</tbody>
            </table>
        </div>`;
}

function checkFeasibility() {
    if (!currentBCRecipe) return;
    const targetKg = parseFloat(document.getElementById('bc-target-kg').value) || 1000;
    const batches = parseInt(document.getElementById('bc-batches').value) || 1;
    const totalKg = targetKg * batches;
    const r = currentBCRecipe;

    let allOk = true;
    const resultRows = r.ingredients.map(ing => {
        const need = ing.ratio * totalKg;
        const have = parseFloat(document.getElementById(`fi-${ing.key}`)?.value) || 0;
        const ok = have >= need;
        if (!ok) allOk = false;
        const shortfall = ok ? 0 : (need - have);
        return `<tr>
            <td><strong>${ing.name}</strong></td>
            <td>${need.toFixed(2)} ${ing.unit}</td>
            <td>${have} ${ing.unit}</td>
            <td>${ok ? '<span style="color:var(--accent-success);">✔ Sufficient</span>' : `<span style="color:var(--accent-danger);">✘ Short by ${shortfall.toFixed(2)} ${ing.unit}</span>`}</td>
        </tr>`;
    }).join('');

    const resultEl = document.getElementById('bc-feasibility-result');
    resultEl.innerHTML = `
        <div style="border-left:4px solid ${allOk ? 'var(--accent-success)' : 'var(--accent-danger)'};padding:0.6rem 1rem;border-radius:6px;background:${allOk ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)'};margin-bottom:0.8rem;">
            <strong style="color:${allOk ? 'var(--accent-success)' : 'var(--accent-danger)'};">${allOk ? '✔ FEASIBLE — You have enough materials to produce ' + totalKg + ' kg of ' + r.name : '✘ NOT FEASIBLE — Insufficient materials. See shortfalls below.'}</strong>
        </div>
        <table class="data-table" style="font-size:0.82rem;">
            <thead><tr><th>Ingredient</th><th>Required</th><th>In Stock</th><th>Status</th></tr></thead>
            <tbody>${resultRows}</tbody>
        </table>`;
}

// ============================================================
// BIO-CEMENT AI ADVISOR
// ============================================================
async function askBCQuestion(overrideQuestion, isAuto = false) {
    if (!currentBCRecipe) return;
    const input = document.getElementById('bc-question-input');
    const ansBox = document.getElementById('bc-ai-answer');
    const btn = document.getElementById('bc-ask-btn');
    const question = overrideQuestion || input?.value?.trim();
    if (!question) { toast('Empty', 'Please enter a question.', 'warning'); return; }

    if (btn && !isAuto) { btn.innerHTML = `<i class='bx bx-loader-alt bx-spin'></i>`; btn.disabled = true; }
    if (ansBox) { ansBox.classList.remove('hidden'); ansBox.textContent = 'AI is thinking...'; }

    const r = currentBCRecipe;
    const prompt = `You are an expert in sustainable construction materials and bio-cement research. The user is asking about "${r.name}" (${r.type}).

Question: "${question}"

Context about this bio-cement:
- Strength: ${r.strength}
- Curing: ${r.curingTime}
- CO₂ saving: ${r.co2Saving}
- Main ingredients: ${r.ingredients.map(i => i.name).join(', ')}

Give a concise, expert, practical answer. Include IS code or international standard references if applicable. Keep response under 200 words.`;

    try {
        const answer = await callAI(prompt);
        if (ansBox) ansBox.textContent = answer;
    } catch (err) {
        if (ansBox) ansBox.textContent = 'Could not reach AI API. Check your internet connection.';
    }

    if (btn && !isAuto) { btn.innerHTML = `<i class='bx bx-send'></i> Ask`; btn.disabled = false; }
    if (input && !isAuto) input.value = '';
}

// ============================================================
// AI DIRECT ACTIONS
// ============================================================

/* 1. DASHBOARD — AI Portfolio Report */
async function generatePortfolioReport() {
    openModal('modal-ai-report');
    document.getElementById('ai-report-modal-title').innerHTML = `<i class='bx bx-analyse'></i> AI Portfolio Report`;
    const box = document.getElementById('ai-report-content');
    box.textContent = 'AI is analysing your portfolio...';

    const projects = projectsData || [];
    const summary = projects.map(p =>
        `• ${p.name} | Status: ${p.status} | Progress: ${Math.round(p.completionPercentage || 0)}% | Budget: ₹${(p.budget || 0).toLocaleString('en-IN')} | Health: ${p.healthScore || 'N/A'} | End: ${p.endDate || '—'}`
    ).join('\n');

    const prompt = `You are a senior construction project manager. Analyse the following portfolio of construction projects and write a concise executive management report.

Projects:
${summary || 'No projects data available.'}

Structure your report as:
1. Portfolio Overview (2-3 sentences)
2. Key Risks & Concerns (bullet points, be specific)
3. Projects Needing Immediate Attention (name them and give 1-line reason)
4. Recommended Actions (3-5 concrete action items for the site manager)
5. Positive Highlights

Keep the total response under 350 words. Use plain text, no markdown symbols.`;

    try {
        box.textContent = await callAI(prompt);
    } catch {
        box.textContent = 'Could not reach AI API. Please check your internet connection.';
    }
}

/* 2. PROJECTS — AI Risk Analysis per project */
async function analyzeProjectRisk(projectId) {
    const p = projectsData.find(x => x.id === projectId);
    if (!p) return;

    openModal('modal-ai-report');
    document.getElementById('ai-report-modal-title').innerHTML = `<i class='bx bx-shield-quarter'></i> Risk Analysis — ${p.name}`;
    const box = document.getElementById('ai-report-content');
    box.textContent = 'AI is analysing project risk...';

    const today = new Date().toISOString().split('T')[0];
    const prompt = `You are a senior construction risk analyst in India. Analyse this construction project and produce a structured risk report.

Project: ${p.name}
Description: ${p.description || 'N/A'}
Status: ${p.status}
Progress: ${Math.round(p.completionPercentage || 0)}%
Budget: ₹${(p.budget || 0).toLocaleString('en-IN')}
Start Date: ${p.startDate || 'N/A'}
End Date: ${p.endDate || 'N/A'}
Today: ${today}
Health Score: ${p.healthScore || 'N/A'}

Provide:
1. RISK LEVEL: (CRITICAL / HIGH / MEDIUM / LOW) with a one-sentence justification
2. Schedule Risk: Is it likely to finish on time? Analyse the dates.
3. Budget Risk: Comment on budget health.
4. Top 3 Risks: Specific risks for this project, each with mitigation step.
5. Recommended Immediate Actions: 3 bullet points for the project manager.

Keep total response under 300 words. Use plain text.`;

    try {
        box.textContent = await callAI(prompt);
    } catch {
        box.textContent = 'Could not reach AI API. Please check your internet connection.';
    }
}

/* 3. ISSUES — AI Fix Suggestion (inline row toggle) */
async function aiFixSuggestion(issueId, title, severity, category, description) {
    const row = document.getElementById(`ai-fix-row-${issueId}`);
    const content = document.getElementById(`ai-fix-content-${issueId}`);
    if (!row || !content) return;

    // Toggle: if already open, close it
    if (!row.classList.contains('hidden')) {
        row.classList.add('hidden');
        return;
    }
    row.classList.remove('hidden');
    content.textContent = 'AI is generating fix steps...';

    const prompt = `You are an expert construction site engineer and safety officer in India. A site issue has been reported. Provide a structured resolution plan.

Issue: ${title}
Category: ${category}
Severity: ${severity}
Description: ${description || 'No additional description.'}

Provide:
1. ROOT CAUSE: Most likely cause (1-2 sentences)
2. IMMEDIATE ACTIONS: Steps to take in the next 24-48 hours (numbered list, 3-5 steps)
3. LONG-TERM FIX: Permanent resolution steps
4. IS CODE / STANDARD: Applicable Indian Standard code or safety regulation if relevant
5. PREVENTION: How to prevent recurrence (2 points)

Keep response under 250 words. Use plain text, no markdown symbols.`;

    try {
        content.textContent = await callAI(prompt);
    } catch {
        content.textContent = 'Could not reach AI API.';
    }
}

/* 4. TASKS — AI Effort Estimation (modal popup) */
async function aiEstimateTask(taskName) {
    openModal('modal-ai-report');
    document.getElementById('ai-report-modal-title').innerHTML = `<i class='bx bx-time'></i> AI Task Estimation — "${taskName}"`;
    const box = document.getElementById('ai-report-content');
    box.textContent = 'AI is estimating duration and cost...';

    const prompt = `You are a senior construction project planner in India. Estimate the effort, duration, and cost for the following construction task.

Task: "${taskName}"

Provide:
1. ESTIMATED DURATION: (in working days, give a range e.g. 7-12 days)
2. CREW REQUIRED: Number and type of workers typically needed
3. ESTIMATED COST: Rough cost range in INR (materials + labour) for a mid-sized residential/commercial project
4. KEY DEPENDENCIES: What must be completed before this task starts?
5. RISK FACTORS: 2-3 things that commonly cause delays for this task
6. QUALITY CHECKPOINTS: 2-3 specific quality checks to perform during/after this task

Keep response under 280 words. Use plain text.`;

    try {
        box.textContent = await callAI(prompt);
    } catch {
        box.textContent = 'Could not reach AI API.';
    }
}

/* 5. MATERIAL GRADES — AI Reorder Plan */
async function generateReorderPlan() {
    const btn = document.getElementById('ai-reorder-btn');
    const resultDiv = document.getElementById('ai-reorder-result');
    btn.innerHTML = `<i class='bx bx-loader-alt bx-spin'></i> Generating Plan...`;
    btn.disabled = true;
    resultDiv.innerHTML = '';

    const inventory = JSON.parse(localStorage.getItem('civiltrack_inventory') || '{}');
    const allGrades = [
        ...(window.CEMENT_GRADES || []).map(g => ({ grade: g.grade, category: 'Cement', qty: inventory[g.grade] || 0, unit: 'bags' })),
        ...(window.STEEL_GRADES || []).map(g => ({ grade: g.grade, category: 'Steel', qty: inventory[g.grade] || 0, unit: 'MT' })),
        ...(window.AGGREGATE_GRADES || []).map(g => ({ grade: g.grade, category: 'Aggregate', qty: inventory[g.grade] || 0, unit: 'm³' }))
    ];
    const invText = allGrades.map(i => `${i.category} ${i.grade}: ${i.qty} ${i.unit}`).join('\n');

    const prompt = `You are a construction materials procurement specialist in India. Based on the current site inventory below, generate a reorder plan.

Current Inventory:
${invText}

Typical site needs per month for a mid-scale construction project:
- OPC 53 or PPC: 500-800 bags
- Fe 500: 5-10 MT
- CA 20mm: 50-80 m³
- Fine Aggregate Zone II: 40-60 m³

Provide:
1. MATERIALS TO ORDER IMMEDIATELY (qty = 0 or critically low): list with recommended reorder quantities and estimated cost per unit in INR
2. MATERIALS TO ORDER SOON (low stock): same details
3. MATERIALS OK (no action needed)
4. TOTAL ESTIMATED PROCUREMENT COST for the immediate orders
5. PROCUREMENT TIP: 1 practical advice for Indian market (preferred vendors, seasonal pricing, etc.)

Keep response under 280 words. Use plain text.`;

    try {
        const answer = await callAI(prompt);
        resultDiv.innerHTML = `<div class="ai-chat-box">${answer.replace(/\n/g, '<br>')}</div>`;
    } catch {
        resultDiv.innerHTML = `<div class="ai-chat-box">Could not reach AI API.</div>`;
    }
    btn.innerHTML = `<i class='bx bx-cart'></i> AI Reorder Plan`;
    btn.disabled = false;
}


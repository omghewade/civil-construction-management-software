// ============================================================
// CivilTrack Enterprise API v2.0
// ============================================================
const fetchAPI = async (url, options = {}) => {
    if (!options.headers) options.headers = {};
    if (options.body && !options.headers['Content-Type']) {
        options.headers['Content-Type'] = 'application/json';
    }
    const res = await fetch(url, options);
    if (res.status === 204) return null;
    if (!res.ok) {
        const errText = await res.text().catch(() => '');
        throw new Error(`HTTP ${res.status}: ${errText || res.statusText}`);
    }
    const text = await res.text();
    return text ? JSON.parse(text) : null;
};

const API = {
    // ---- Auth ----
    login: (u, p) => fetchAPI('/api/auth/login', { method: 'POST', body: JSON.stringify({ username: u, password: p }) }),
    logout: () => fetch('/api/auth/logout', { method: 'POST' }),
    checkAuth: () => fetchAPI('/api/auth/me'),

    // ---- Projects ----
    getProjects: () => fetchAPI('/api/projects'),
    createProject: (project) => fetchAPI('/api/projects', { method: 'POST', body: JSON.stringify(project) }),

    // ---- Tasks ----
    getTasks: (projectId) => fetchAPI(`/api/projects/${projectId}/tasks`),
    createTask: (projectId, task) => fetchAPI(`/api/projects/${projectId}/tasks`, { method: 'POST', body: JSON.stringify(task) }),
    updateTaskProgress: (taskId, progress, cost) => fetchAPI(`/api/tasks/${taskId}/progress`, {
        method: 'PUT',
        body: JSON.stringify({ progress: parseInt(progress), actualCost: parseFloat(cost) || 0 })
    }),

    // ---- Resources ----
    getEquipment: (projectId) => fetchAPI(`/api/equipment/project/${projectId}`),
    getLaborForce: (projectId) => fetchAPI(`/api/labor/project/${projectId}`),
    getMaterials: (projectId) => fetchAPI(`/api/materials/project/${projectId}`),

    // ---- Issues ----
    getIssues: (projectId) => fetchAPI(`/api/issues/project/${projectId}`),
    createIssue: (projectId, issue) => fetchAPI(`/api/issues/project/${projectId}`, { method: 'POST', body: JSON.stringify(issue) }),
    updateIssueStatus: (issueId, status) => fetchAPI(`/api/issues/${issueId}/status`, { method: 'PUT', body: JSON.stringify({ status }) }),

    // ---- Users ----
    getEngineers: () => fetchAPI('/api/users/engineers'),
    getAllUsers: () => fetchAPI('/api/users'),

    // ---- Logs ----
    getRecentLogs: () => fetchAPI('/api/activity-logs/recent'),

    // ---- Weather (OpenMeteo, no API key needed, defaults Mumbai coords) ----
    getWeather: (lat = 19.076, lon = 72.8777) =>
        fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,precipitation,weather_code&timezone=auto`)
            .then(r => r.json())
};

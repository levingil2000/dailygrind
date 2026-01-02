// ============================================
// FIXED DAILY TASKS
// ============================================
// These are the 7 tasks that appear every day
const DAILY_TASKS = [
    { id: 1, name: 'Read technical paper' },
    { id: 2, name: 'Read technical book' },
    { id: 3, name: 'Read any book' },
    { id: 4, name: 'Run' },
    { id: 5, name: 'Strength training' },
    { id: 6, name: 'Reflection (daily gospel digest)' },
    { id: 7, name: 'Coding (side projects)' }
];

// ============================================
// DATABASE SETUP (IndexedDB)
// ============================================
let db; // This will hold our database connection

// Open or create the database
function openDatabase() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('DailyChecklistDB', 1);

        request.onupgradeneeded = function(event) {
            db = event.target.result;
            if (!db.objectStoreNames.contains('dailyData')) {
                db.createObjectStore('dailyData', { keyPath: 'date' });
            }
        };

        request.onsuccess = function(event) {
            db = event.target.result;
            resolve(db);
        };

        request.onerror = function(event) {
            reject('Database error: ' + event.target.error);
        };
    });
}

// ============================================
// DATE FUNCTIONS
// ============================================

// Get today's date in YYYY-MM-DD format
function getTodayDateString() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Get formatted date for display (e.g., "Thursday, January 1, 2026")
function getFormattedDate(dateString) {
    if (!dateString) {
        const today = new Date();
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        return today.toLocaleDateString('en-US', options);
    }
    
    const date = new Date(dateString + 'T00:00:00');
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
}

// Get short formatted date (e.g., "Jan 1, 2026")
function getShortFormattedDate(dateString) {
    const date = new Date(dateString + 'T00:00:00');
    const options = { month: 'short', day: 'numeric', year: 'numeric' };
    return date.toLocaleDateString('en-US', options);
}

// Generate array of dates for last N days
function getDateRange(days) {
    const dates = [];
    const today = new Date();
    
    for (let i = days - 1; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        dates.push(`${year}-${month}-${day}`);
    }
    
    return dates;
}

// ============================================
// DATA FUNCTIONS
// ============================================

// Load data for a specific date
function loadDataForDate(dateString) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['dailyData'], 'readonly');
        const store = transaction.objectStore('dailyData');
        const request = store.get(dateString);

        request.onsuccess = function(event) {
            const data = event.target.result;
            
            if (!data) {
                const defaultData = {
                    date: dateString,
                    tasks: {}
                };
                
                DAILY_TASKS.forEach(task => {
                    defaultData.tasks[task.id] = {
                        completed: false,
                        note: ''
                    };
                });
                
                resolve(defaultData);
            } else {
                resolve(data);
            }
        };

        request.onerror = function(event) {
            reject('Error loading data: ' + event.target.error);
        };
    });
}

// Shorthand for loading today's data
function loadTodayData() {
    return loadDataForDate(getTodayDateString());
}

// Save data for any date to the database
function saveData(data) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['dailyData'], 'readwrite');
        const store = transaction.objectStore('dailyData');
        const request = store.put(data);

        request.onsuccess = function() {
            resolve();
        };

        request.onerror = function(event) {
            reject('Error saving data: ' + event.target.error);
        };
    });
}

// Get all historical data (excluding today)
function getAllHistoryData() {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['dailyData'], 'readonly');
        const store = transaction.objectStore('dailyData');
        const request = store.getAll();

        request.onsuccess = function(event) {
            const allData = event.target.result;
            const todayDate = getTodayDateString();
            
            const history = allData
                .filter(item => item.date !== todayDate)
                .sort((a, b) => b.date.localeCompare(a.date));
            
            resolve(history);
        };

        request.onerror = function(event) {
            reject('Error loading history: ' + event.target.error);
        };
    });
}

// Get all data including today
function getAllData() {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['dailyData'], 'readonly');
        const store = transaction.objectStore('dailyData');
        const request = store.getAll();

        request.onsuccess = function(event) {
            resolve(event.target.result);
        };

        request.onerror = function(event) {
            reject('Error loading all data: ' + event.target.error);
        };
    });
}

// ============================================
// TODAY VIEW - UI UPDATE FUNCTIONS
// ============================================

// Update the progress bar and text
function updateProgress(data) {
    let completedCount = 0;
    DAILY_TASKS.forEach(task => {
        if (data.tasks[task.id].completed) {
            completedCount++;
        }
    });

    const percentage = (completedCount / DAILY_TASKS.length) * 100;

    const progressText = document.getElementById('progressText');
    progressText.textContent = `${completedCount} of ${DAILY_TASKS.length} tasks completed`;

    const progressFill = document.getElementById('progressFill');
    progressFill.style.width = percentage + '%';
}

// Render all tasks on the page (TODAY view)
function renderTasks(data) {
    const container = document.getElementById('tasksContainer');
    container.innerHTML = '';

    DAILY_TASKS.forEach(task => {
        const taskData = data.tasks[task.id];
        
        const taskItem = document.createElement('div');
        taskItem.className = 'task-item';
        if (taskData.completed) {
            taskItem.classList.add('completed');
        }

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = taskData.completed;
        checkbox.id = 'task-' + task.id;
        
        checkbox.addEventListener('change', function() {
            handleTaskToggle(task.id, this.checked);
        });

        const label = document.createElement('label');
        label.className = 'task-label';
        label.htmlFor = 'task-' + task.id;
        label.textContent = task.name;

        const noteBtn = document.createElement('button');
        noteBtn.className = 'note-btn';
        noteBtn.textContent = 'Add Note';
        
        if (taskData.note && taskData.note.trim() !== '') {
            noteBtn.classList.add('has-note');
            noteBtn.textContent = 'Edit Note';
        }
        
        noteBtn.addEventListener('click', function() {
            openNoteModal(task.id, task.name);
        });

        taskItem.appendChild(checkbox);
        taskItem.appendChild(label);
        taskItem.appendChild(noteBtn);

        container.appendChild(taskItem);
    });

    updateProgress(data);
}

// ============================================
// PROGRESS VIEW - HEATMAP
// ============================================

// Render the GitHub-style heatmap
async function renderHeatmap() {
    try {
        const allData = await getAllData();
        const container = document.getElementById('heatmapContainer');
        
        // Create data map for quick lookup
        const dataMap = {};
        allData.forEach(dayData => {
            let completedCount = 0;
            DAILY_TASKS.forEach(task => {
                if (dayData.tasks[task.id].completed) {
                    completedCount++;
                }
            });
            dataMap[dayData.date] = completedCount;
        });

        // Generate last 365 days
        const dates = getDateRange(365);
        
        // Create grid container
        const grid = document.createElement('div');
        grid.className = 'heatmap-grid';

        // Calculate which day of week the first date falls on
        const firstDate = new Date(dates[0] + 'T00:00:00');
        const firstDayOfWeek = firstDate.getDay(); // 0 = Sunday

        // Add empty cells to align the first date properly
        for (let i = 0; i < firstDayOfWeek; i++) {
            const emptyCell = document.createElement('div');
            emptyCell.className = 'heatmap-cell empty';
            grid.appendChild(emptyCell);
        }

        // Create cells for each date
        dates.forEach(dateString => {
            const cell = document.createElement('div');
            cell.className = 'heatmap-cell';
            
            const completedCount = dataMap[dateString] || 0;
            
            // Determine color level (0-4)
            let level = 0;
            if (completedCount === 0) level = 0;
            else if (completedCount <= 2) level = 1;
            else if (completedCount <= 4) level = 2;
            else if (completedCount <= 6) level = 3;
            else level = 4;
            
            cell.setAttribute('data-level', level);
            cell.setAttribute('data-date', dateString);
            cell.setAttribute('data-count', completedCount);
            
            // Hover and click events
            cell.addEventListener('mouseenter', showHeatmapTooltip);
            cell.addEventListener('mouseleave', hideHeatmapTooltip);
            cell.addEventListener('click', function() {
                loadDataForDate(dateString).then(dayData => {
                    showDayDetail(dayData);
                });
            });
            
            grid.appendChild(cell);
        });

        container.innerHTML = '';
        container.appendChild(grid);

        // Create tooltip element if it doesn't exist
        if (!document.getElementById('heatmapTooltip')) {
            const tooltip = document.createElement('div');
            tooltip.id = 'heatmapTooltip';
            tooltip.className = 'heatmap-tooltip';
            document.body.appendChild(tooltip);
        }

    } catch (error) {
        console.error('Error rendering heatmap:', error);
    }
}

// Show tooltip on heatmap hover
function showHeatmapTooltip(event) {
    const cell = event.target;
    const date = cell.getAttribute('data-date');
    const count = cell.getAttribute('data-count');
    
    if (!date) return;
    
    const tooltip = document.getElementById('heatmapTooltip');
    const formattedDate = getShortFormattedDate(date);
    
    tooltip.textContent = `${formattedDate}: ${count}/7 tasks`;
    tooltip.classList.add('active');
    
    // Position tooltip near cursor
    const rect = cell.getBoundingClientRect();
    tooltip.style.left = rect.left + (rect.width / 2) - (tooltip.offsetWidth / 2) + 'px';
    tooltip.style.top = rect.top - tooltip.offsetHeight - 8 + 'px';
}

// Hide tooltip
function hideHeatmapTooltip() {
    const tooltip = document.getElementById('heatmapTooltip');
    tooltip.classList.remove('active');
}

// ============================================
// PROGRESS VIEW - TASK STATISTICS
// ============================================

// Render task statistics cards
async function renderTaskStats() {
    try {
        const allData = await getAllData();
        const container = document.getElementById('taskStatsContainer');
        container.innerHTML = '';

        // Calculate start of year
        const today = new Date();
        const startOfYear = new Date(today.getFullYear(), 0, 1);
        const daysSinceStartOfYear = Math.floor((today - startOfYear) / (1000 * 60 * 60 * 24)) + 1;

        DAILY_TASKS.forEach(task => {
            // Calculate statistics for this task
            let completedDays = 0;
            let totalActiveDays = 0;
            let missedDays = 0;

            allData.forEach(dayData => {
                const taskData = dayData.tasks[task.id];
                
                // Count total active days (days where at least one task was done)
                const hasAnyTask = DAILY_TASKS.some(t => dayData.tasks[t.id].completed);
                
                if (taskData.completed) {
                    completedDays++;
                }
                
                if (hasAnyTask) {
                    totalActiveDays++;
                    if (!taskData.completed) {
                        missedDays++;
                    }
                }
            });

            // Calculate success rate
            const successRate = totalActiveDays > 0 
                ? Math.round((completedDays / totalActiveDays) * 100) 
                : 0;

            // Create card
            const card = document.createElement('div');
            card.className = 'task-stat-card';

            const name = document.createElement('div');
            name.className = 'task-stat-name';
            name.textContent = task.name;

            const metrics = document.createElement('div');
            metrics.className = 'task-stat-metrics';

            // Progress metric
            const progressMetric = document.createElement('div');
            progressMetric.className = 'task-stat-metric';
            progressMetric.innerHTML = `
                <span class="metric-label">Progress</span>
                <span class="metric-value">${completedDays}/${daysSinceStartOfYear}</span>
            `;

            // Success rate metric
            const successMetric = document.createElement('div');
            successMetric.className = 'task-stat-metric';
            successMetric.innerHTML = `
                <span class="metric-label">Success Rate</span>
                <span class="metric-value success">${successRate}%</span>
            `;

            // Misses metric
            const missesMetric = document.createElement('div');
            missesMetric.className = 'task-stat-metric';
            missesMetric.innerHTML = `
                <span class="metric-label">Misses</span>
                <span class="metric-value danger">${missedDays} days</span>
            `;

            metrics.appendChild(progressMetric);
            metrics.appendChild(successMetric);
            metrics.appendChild(missesMetric);

            // Progress bar
            const progressBarContainer = document.createElement('div');
            progressBarContainer.className = 'task-stat-progress-bar';
            
            const progressBarFill = document.createElement('div');
            progressBarFill.className = 'task-stat-progress-fill';
            const progressPercentage = (completedDays / daysSinceStartOfYear) * 100;
            progressBarFill.style.width = progressPercentage + '%';
            
            progressBarContainer.appendChild(progressBarFill);

            card.appendChild(name);
            card.appendChild(metrics);
            card.appendChild(progressBarContainer);

            container.appendChild(card);
        });

    } catch (error) {
        console.error('Error rendering task stats:', error);
    }
}

// ============================================
// HISTORY VIEW
// ============================================

// Render the history list
async function renderHistory() {
    try {
        const historyData = await getAllHistoryData();
        const historyList = document.getElementById('historyList');
        const emptyState = document.getElementById('emptyHistory');

        if (historyData.length === 0) {
            emptyState.style.display = 'block';
            historyList.style.display = 'none';
            return;
        }

        emptyState.style.display = 'none';
        historyList.style.display = 'flex';
        historyList.innerHTML = '';

        historyData.forEach(dayData => {
            let completedCount = 0;
            DAILY_TASKS.forEach(task => {
                if (dayData.tasks[task.id].completed) {
                    completedCount++;
                }
            });

            const historyItem = document.createElement('div');
            historyItem.className = 'history-item';
            
            historyItem.addEventListener('click', function() {
                showDayDetail(dayData);
            });

            const leftDiv = document.createElement('div');
            leftDiv.className = 'history-item-left';

            const dateDiv = document.createElement('div');
            dateDiv.className = 'history-date';
            dateDiv.textContent = getFormattedDate(dayData.date);

            const summaryDiv = document.createElement('div');
            summaryDiv.className = 'history-summary';
            summaryDiv.textContent = `${completedCount} of ${DAILY_TASKS.length} tasks completed`;

            leftDiv.appendChild(dateDiv);
            leftDiv.appendChild(summaryDiv);

            const scoreDiv = document.createElement('div');
            scoreDiv.className = 'history-score';
            scoreDiv.textContent = `${completedCount}/7`;

            historyItem.appendChild(leftDiv);
            historyItem.appendChild(scoreDiv);
            historyList.appendChild(historyItem);
        });

    } catch (error) {
        console.error('Error rendering history:', error);
    }
}

// Show detailed view of a specific day
function showDayDetail(dayData) {
    const modal = document.getElementById('dayDetailModal');
    const dateHeader = document.getElementById('dayDetailDate');
    const summaryText = document.getElementById('dayDetailSummary');
    const tasksContainer = document.getElementById('dayDetailTasks');

    dateHeader.textContent = getFormattedDate(dayData.date);

    let completedCount = 0;
    DAILY_TASKS.forEach(task => {
        if (dayData.tasks[task.id].completed) {
            completedCount++;
        }
    });

    summaryText.textContent = `${completedCount} of ${DAILY_TASKS.length} tasks completed`;

    tasksContainer.innerHTML = '';

    DAILY_TASKS.forEach(task => {
        const taskData = dayData.tasks[task.id];
        
        const taskDiv = document.createElement('div');
        taskDiv.className = 'day-detail-task';
        taskDiv.classList.add(taskData.completed ? 'completed' : 'incomplete');

        const taskName = document.createElement('div');
        taskName.className = 'day-detail-task-name';
        taskName.textContent = taskData.completed ? '✓ ' + task.name : '✗ ' + task.name;

        taskDiv.appendChild(taskName);

        if (taskData.note && taskData.note.trim() !== '') {
            const noteDiv = document.createElement('div');
            noteDiv.className = 'day-detail-task-note';
            noteDiv.textContent = taskData.note;
            taskDiv.appendChild(noteDiv);
        }

        tasksContainer.appendChild(taskDiv);
    });

    modal.classList.add('active');
}

// Close day detail modal
function closeDayDetailModal() {
    const modal = document.getElementById('dayDetailModal');
    modal.classList.remove('active');
}

// ============================================
// TAB SWITCHING
// ============================================

function switchToTab(tabName) {
    const todayTab = document.getElementById('todayTab');
    const progressTab = document.getElementById('progressTab');
    const historyTab = document.getElementById('historyTab');
    
    todayTab.classList.remove('active');
    progressTab.classList.remove('active');
    historyTab.classList.remove('active');

    const todayView = document.getElementById('todayView');
    const progressView = document.getElementById('progressView');
    const historyView = document.getElementById('historyView');
    
    todayView.classList.remove('active');
    progressView.classList.remove('active');
    historyView.classList.remove('active');

    if (tabName === 'today') {
        todayTab.classList.add('active');
        todayView.classList.add('active');
    } else if (tabName === 'progress') {
        progressTab.classList.add('active');
        progressView.classList.add('active');
        renderHeatmap();
        renderTaskStats();
    } else if (tabName === 'history') {
        historyTab.classList.add('active');
        historyView.classList.add('active');
        renderHistory();
    }
}

// ============================================
// EVENT HANDLERS - TODAY VIEW
// ============================================

// Handle task checkbox toggle
async function handleTaskToggle(taskId, isCompleted) {
    try {
        const data = await loadTodayData();
        data.tasks[taskId].completed = isCompleted;
        await saveData(data);
        renderTasks(data);
    } catch (error) {
        console.error('Error toggling task:', error);
        alert('Failed to update task. Please try again.');
    }
}

// Open the note modal for a specific task
let currentTaskId = null;

function openNoteModal(taskId, taskName) {
    currentTaskId = taskId;
    
    const modal = document.getElementById('noteModal');
    const modalTaskName = document.getElementById('modalTaskName');
    const noteTextarea = document.getElementById('noteTextarea');

    modalTaskName.textContent = taskName;

    loadTodayData().then(data => {
        noteTextarea.value = data.tasks[taskId].note || '';
    });

    modal.classList.add('active');
    noteTextarea.focus();
}

// Close the note modal
function closeNoteModal() {
    const modal = document.getElementById('noteModal');
    modal.classList.remove('active');
    currentTaskId = null;
}

// Save the note
async function saveNote() {
    if (currentTaskId === null) return;

    try {
        const noteTextarea = document.getElementById('noteTextarea');
        const noteText = noteTextarea.value.trim();

        const data = await loadTodayData();
        data.tasks[currentTaskId].note = noteText;
        
        await saveData(data);
        closeNoteModal();
        renderTasks(data);
    } catch (error) {
        console.error('Error saving note:', error);
        alert('Failed to save note. Please try again.');
    }
}

// ============================================
// SERVICE WORKER REGISTRATION
// ============================================

if ('serviceWorker' in navigator) {
    window.addEventListener('load', function() {
        navigator.serviceWorker.register('sw.js')
            .then(function(registration) {
                console.log('Service Worker registered successfully:', registration.scope);
            })
            .catch(function(error) {
                console.log('Service Worker registration failed:', error);
            });
    });
}

// ============================================
// INITIALIZATION
// ============================================

async function initApp() {
    try {
        await openDatabase();
        
        const currentDate = document.getElementById('currentDate');
        currentDate.textContent = getFormattedDate();

        const data = await loadTodayData();
        renderTasks(data);

        const todayTab = document.getElementById('todayTab');
        const progressTab = document.getElementById('progressTab');
        const historyTab = document.getElementById('historyTab');
        
        todayTab.addEventListener('click', function() {
            switchToTab('today');
        });
        
        progressTab.addEventListener('click', function() {
            switchToTab('progress');
        });
        
        historyTab.addEventListener('click', function() {
            switchToTab('history');
        });

        const saveNoteBtn = document.getElementById('saveNoteBtn');
        const cancelNoteBtn = document.getElementById('cancelNoteBtn');
        const noteModal = document.getElementById('noteModal');

        saveNoteBtn.addEventListener('click', saveNote);
        cancelNoteBtn.addEventListener('click', closeNoteModal);

        noteModal.addEventListener('click', function(event) {
            if (event.target === noteModal) {
                closeNoteModal();
            }
        });

        const closeDayDetailBtn = document.getElementById('closeDayDetailBtn');
        const dayDetailModal = document.getElementById('dayDetailModal');
        
        closeDayDetailBtn.addEventListener('click', closeDayDetailModal);
        
        dayDetailModal.addEventListener('click', function(event) {
            if (event.target === dayDetailModal) {
                closeDayDetailModal();
            }
        });

    } catch (error) {
        console.error('Error initializing app:', error);
        alert('Failed to initialize app. Please refresh the page.');
    }
}

// Start the app when page is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}
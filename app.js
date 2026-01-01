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
// IndexedDB is a browser database that stores data permanently on the device
// It works offline and survives page refreshes

let db; // This will hold our database connection

// Open or create the database
function openDatabase() {
    return new Promise((resolve, reject) => {
        // Open database named 'DailyChecklistDB', version 1
        const request = indexedDB.open('DailyChecklistDB', 1);

        // This runs only the first time or when version changes
        // It sets up the database structure
        request.onupgradeneeded = function(event) {
            db = event.target.result;
            
            // Create a "table" (object store) called 'dailyData'
            // It stores one record per day with date as the key
            if (!db.objectStoreNames.contains('dailyData')) {
                db.createObjectStore('dailyData', { keyPath: 'date' });
            }
        };

        // Successfully opened
        request.onsuccess = function(event) {
            db = event.target.result;
            resolve(db);
        };

        // Error opening database
        request.onerror = function(event) {
            reject('Database error: ' + event.target.error);
        };
    });
}

// ============================================
// DATA FUNCTIONS
// ============================================

// Get today's date in YYYY-MM-DD format (e.g., "2025-01-15")
function getTodayDateString() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Get formatted date for display (e.g., "Thursday, January 1, 2026")
function getFormattedDate(dateString) {
    // If no date provided, use today
    if (!dateString) {
        const today = new Date();
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        return today.toLocaleDateString('en-US', options);
    }
    
    // Parse the YYYY-MM-DD string
    const date = new Date(dateString + 'T00:00:00');
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
}

// Load data for a specific date
function loadDataForDate(dateString) {
    return new Promise((resolve, reject) => {
        // Start a transaction to read from the database
        const transaction = db.transaction(['dailyData'], 'readonly');
        const store = transaction.objectStore('dailyData');
        const request = store.get(dateString);

        request.onsuccess = function(event) {
            const data = event.target.result;
            
            // If no data exists for this date, create default structure
            if (!data) {
                const defaultData = {
                    date: dateString,
                    tasks: {}
                };
                
                // Initialize each task as incomplete with no note
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
        // Start a transaction to write to the database
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
            
            // Filter out today and sort by date (newest first)
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

// ============================================
// UI UPDATE FUNCTIONS - TODAY VIEW
// ============================================

// Update the progress bar and text
function updateProgress(data) {
    // Count how many tasks are completed
    let completedCount = 0;
    DAILY_TASKS.forEach(task => {
        if (data.tasks[task.id].completed) {
            completedCount++;
        }
    });

    // Calculate percentage
    const percentage = (completedCount / DAILY_TASKS.length) * 100;

    // Update the progress text (e.g., "3 of 7 tasks completed")
    const progressText = document.getElementById('progressText');
    progressText.textContent = `${completedCount} of ${DAILY_TASKS.length} tasks completed`;

    // Update the progress bar width
    const progressFill = document.getElementById('progressFill');
    progressFill.style.width = percentage + '%';
}

// Render all tasks on the page (TODAY view)
function renderTasks(data) {
    const container = document.getElementById('tasksContainer');
    container.innerHTML = ''; // Clear existing tasks

    // Create HTML for each task
    DAILY_TASKS.forEach(task => {
        const taskData = data.tasks[task.id];
        
        // Create task item container
        const taskItem = document.createElement('div');
        taskItem.className = 'task-item';
        if (taskData.completed) {
            taskItem.classList.add('completed');
        }

        // Create checkbox
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = taskData.completed;
        checkbox.id = 'task-' + task.id;
        
        // When checkbox is clicked, update completion status
        checkbox.addEventListener('change', function() {
            handleTaskToggle(task.id, this.checked);
        });

        // Create label
        const label = document.createElement('label');
        label.className = 'task-label';
        label.htmlFor = 'task-' + task.id;
        label.textContent = task.name;

        // Create note button
        const noteBtn = document.createElement('button');
        noteBtn.className = 'note-btn';
        noteBtn.textContent = 'Add Note';
        
        // If note exists, change button appearance
        if (taskData.note && taskData.note.trim() !== '') {
            noteBtn.classList.add('has-note');
            noteBtn.textContent = 'Edit Note';
        }
        
        // When note button is clicked, open modal
        noteBtn.addEventListener('click', function() {
            openNoteModal(task.id, task.name);
        });

        // Add all elements to task item
        taskItem.appendChild(checkbox);
        taskItem.appendChild(label);
        taskItem.appendChild(noteBtn);

        // Add task item to container
        container.appendChild(taskItem);
    });

    // Update progress bar
    updateProgress(data);
}

// ============================================
// UI UPDATE FUNCTIONS - HISTORY VIEW
// ============================================

// Render the history list
async function renderHistory() {
    try {
        const historyData = await getAllHistoryData();
        const historyList = document.getElementById('historyList');
        const emptyState = document.getElementById('emptyHistory');

        // Show empty state if no history
        if (historyData.length === 0) {
            emptyState.style.display = 'block';
            historyList.style.display = 'none';
            return;
        }

        // Hide empty state and show history
        emptyState.style.display = 'none';
        historyList.style.display = 'flex';
        historyList.innerHTML = ''; // Clear existing items

        // Create a card for each historical day
        historyData.forEach(dayData => {
            // Count completed tasks
            let completedCount = 0;
            DAILY_TASKS.forEach(task => {
                if (dayData.tasks[task.id].completed) {
                    completedCount++;
                }
            });

            // Create history item
            const historyItem = document.createElement('div');
            historyItem.className = 'history-item';
            
            // Click handler to show day detail
            historyItem.addEventListener('click', function() {
                showDayDetail(dayData);
            });

            // Left side (date and summary)
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

            // Right side (score)
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

    // Set date header
    dateHeader.textContent = getFormattedDate(dayData.date);

    // Count completed tasks
    let completedCount = 0;
    DAILY_TASKS.forEach(task => {
        if (dayData.tasks[task.id].completed) {
            completedCount++;
        }
    });

    // Set summary
    summaryText.textContent = `${completedCount} of ${DAILY_TASKS.length} tasks completed`;

    // Clear tasks container
    tasksContainer.innerHTML = '';

    // Render each task
    DAILY_TASKS.forEach(task => {
        const taskData = dayData.tasks[task.id];
        
        const taskDiv = document.createElement('div');
        taskDiv.className = 'day-detail-task';
        taskDiv.classList.add(taskData.completed ? 'completed' : 'incomplete');

        const taskName = document.createElement('div');
        taskName.className = 'day-detail-task-name';
        taskName.textContent = taskData.completed ? '✓ ' + task.name : '✗ ' + task.name;

        taskDiv.appendChild(taskName);

        // Add note if exists
        if (taskData.note && taskData.note.trim() !== '') {
            const noteDiv = document.createElement('div');
            noteDiv.className = 'day-detail-task-note';
            noteDiv.textContent = taskData.note;
            taskDiv.appendChild(noteDiv);
        }

        tasksContainer.appendChild(taskDiv);
    });

    // Show modal
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
    // Update tab buttons
    const todayTab = document.getElementById('todayTab');
    const historyTab = document.getElementById('historyTab');
    
    if (tabName === 'today') {
        todayTab.classList.add('active');
        historyTab.classList.remove('active');
    } else {
        todayTab.classList.remove('active');
        historyTab.classList.add('active');
    }

    // Update tab content
    const todayView = document.getElementById('todayView');
    const historyView = document.getElementById('historyView');
    
    if (tabName === 'today') {
        todayView.classList.add('active');
        historyView.classList.remove('active');
    } else {
        todayView.classList.remove('active');
        historyView.classList.add('active');
        // Refresh history when switching to it
        renderHistory();
    }
}

// ============================================
// EVENT HANDLERS - TODAY VIEW
// ============================================

// Handle task checkbox toggle
async function handleTaskToggle(taskId, isCompleted) {
    try {
        // Load current data
        const data = await loadTodayData();
        
        // Update the specific task
        data.tasks[taskId].completed = isCompleted;
        
        // Save to database
        await saveData(data);
        
        // Re-render to show changes
        renderTasks(data);
    } catch (error) {
        console.error('Error toggling task:', error);
        alert('Failed to update task. Please try again.');
    }
}

// Open the note modal for a specific task
let currentTaskId = null; // Track which task we're editing

function openNoteModal(taskId, taskName) {
    currentTaskId = taskId;
    
    // Get the modal elements
    const modal = document.getElementById('noteModal');
    const modalTaskName = document.getElementById('modalTaskName');
    const noteTextarea = document.getElementById('noteTextarea');

    // Set the task name in modal
    modalTaskName.textContent = taskName;

    // Load existing note if any
    loadTodayData().then(data => {
        noteTextarea.value = data.tasks[taskId].note || '';
    });

    // Show the modal
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
        // Get the note text
        const noteTextarea = document.getElementById('noteTextarea');
        const noteText = noteTextarea.value.trim();

        // Load current data
        const data = await loadTodayData();
        
        // Update the note for this task
        data.tasks[currentTaskId].note = noteText;
        
        // Save to database
        await saveData(data);
        
        // Close modal
        closeNoteModal();
        
        // Re-render to show updated button state
        renderTasks(data);
    } catch (error) {
        console.error('Error saving note:', error);
        alert('Failed to save note. Please try again.');
    }
}

// ============================================
// SERVICE WORKER REGISTRATION
// ============================================
// Service worker enables offline functionality

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
// This runs when the page loads

async function initApp() {
    try {
        // Open database connection
        await openDatabase();
        
        // Set today's date in the header
        const currentDate = document.getElementById('currentDate');
        currentDate.textContent = getFormattedDate();

        // Load and display today's tasks
        const data = await loadTodayData();
        renderTasks(data);

        // Set up tab switching
        const todayTab = document.getElementById('todayTab');
        const historyTab = document.getElementById('historyTab');
        
        todayTab.addEventListener('click', function() {
            switchToTab('today');
        });
        
        historyTab.addEventListener('click', function() {
            switchToTab('history');
        });

        // Set up note modal button event listeners
        const saveNoteBtn = document.getElementById('saveNoteBtn');
        const cancelNoteBtn = document.getElementById('cancelNoteBtn');
        const noteModal = document.getElementById('noteModal');

        saveNoteBtn.addEventListener('click', saveNote);
        cancelNoteBtn.addEventListener('click', closeNoteModal);

        // Close note modal if user clicks outside the modal content
        noteModal.addEventListener('click', function(event) {
            if (event.target === noteModal) {
                closeNoteModal();
            }
        });

        // Set up day detail modal close button
        const closeDayDetailBtn = document.getElementById('closeDayDetailBtn');
        const dayDetailModal = document.getElementById('dayDetailModal');
        
        closeDayDetailBtn.addEventListener('click', closeDayDetailModal);
        
        // Close day detail modal if user clicks outside
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
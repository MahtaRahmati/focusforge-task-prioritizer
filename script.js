"use strict";

const STORAGE_KEY = "focusforge-tasks-v1";
const THEME_KEY = "focusforge-theme-v1";

const priorityLabels = {
  low: "کم",
  medium: "متوسط",
  high: "زیاد",
  critical: "بحرانی",
};

const statusLabels = {
  backlog: "صف",
  doing: "در حال انجام",
  done: "انجام شد",
};

const priorityWeights = {
  low: 10,
  medium: 25,
  high: 40,
  critical: 60,
};

const taskForm = document.querySelector("#task-form");
const formMessage = document.querySelector("#form-message");
const taskList = document.querySelector("#task-list");
const focusList = document.querySelector("#focus-list");
const searchInput = document.querySelector("#search-input");
const sortSelect = document.querySelector("#sort-select");
const filterButtons = document.querySelectorAll(".filter-button");
const clearCompletedButton = document.querySelector("#clear-completed");
const resultCount = document.querySelector("#result-count");

const statOpen = document.querySelector("#stat-open");
const statToday = document.querySelector("#stat-today");
const statOverdue = document.querySelector("#stat-overdue");
const statCompletion = document.querySelector("#stat-completion");

const heroFocusScore = document.querySelector("#hero-focus-score");
const heroProgressBar = document.querySelector("#hero-progress-bar");
const heroFocusCaption = document.querySelector("#hero-focus-caption");

const todayLabel = document.querySelector("#today-label");
const themeToggle = document.querySelector("#theme-toggle");
const exportButton = document.querySelector("#export-button");
const importInput = document.querySelector("#import-input");

const focusTaskName = document.querySelector("#focus-task-name");
const focusTaskMeta = document.querySelector("#focus-task-meta");
const timerDisplay = document.querySelector("#timer-display");
const timerStart = document.querySelector("#timer-start");
const timerPause = document.querySelector("#timer-pause");
const timerReset = document.querySelector("#timer-reset");

const editDialog = document.querySelector("#edit-dialog");
const editForm = document.querySelector("#edit-form");
const editId = document.querySelector("#edit-id");
const editTitle = document.querySelector("#edit-title");
const editCategory = document.querySelector("#edit-category");
const editPriority = document.querySelector("#edit-priority");
const editDueDate = document.querySelector("#edit-due-date");
const editEstimate = document.querySelector("#edit-estimate");
const editNotes = document.querySelector("#edit-notes");
const closeDialog = document.querySelector("#close-dialog");
const cancelEdit = document.querySelector("#cancel-edit");

let tasks = loadTasks();
let currentFilter = "all";
let searchQuery = "";

let focusTaskId = null;
let timerSeconds = 25 * 60;
let timerInterval = null;

function createTaskId() {
  if (window.crypto?.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function normalizeTask(task) {
  return {
    id: task.id || createTaskId(),
    title: String(task.title || "").trim(),
    category: String(task.category || "").trim(),
    priority: priorityWeights[task.priority] ? task.priority : "medium",
    dueDate: task.dueDate || "",
    estimate: Number(task.estimate) || 30,
    notes: String(task.notes || "").trim(),
    status: ["backlog", "doing", "done"].includes(task.status)
      ? task.status
      : "backlog",
    createdAt: task.createdAt || new Date().toISOString(),
    completedAt: task.completedAt || null,
  };
}

function loadTasks() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normalizeTask).filter((task) => task.title);
  } catch (error) {
    console.error("Could not load tasks:", error);
    return [];
  }
}

function saveTasks() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  } catch (error) {
    console.error("Could not save tasks:", error);
  }
}

function showMessage(message = "") {
  formMessage.textContent = message;
}

function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

function parseDueDate(dateString) {
  if (!dateString) return null;
  const [year, month, day] = dateString.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  date.setHours(23, 59, 59, 999);
  return date;
}

function isToday(task) {
  const due = parseDueDate(task.dueDate);
  if (!due) return false;
  const now = new Date();
  return (
    due.getFullYear() === now.getFullYear() &&
    due.getMonth() === now.getMonth() &&
    due.getDate() === now.getDate()
  );
}

function isOverdue(task) {
  const due = parseDueDate(task.dueDate);
  return Boolean(due && task.status !== "done" && due < new Date());
}

function daysUntilDue(task) {
  const due = parseDueDate(task.dueDate);
  if (!due) return null;
  const diff = due.getTime() - startOfToday().getTime();
  return Math.ceil(diff / 86400000);
}

function focusScore(task) {
  if (task.status === "done") return 0;

  let score = priorityWeights[task.priority] || 25;
  const days = daysUntilDue(task);

  if (days !== null) {
    if (days < 0) {
      score += 50 + Math.min(Math.abs(days) * 4, 20);
    } else if (days === 0) {
      score += 45;
    } else if (days === 1) {
      score += 35;
    } else if (days <= 3) {
      score += 25;
    } else if (days <= 7) {
      score += 15;
    } else {
      score += 5;
    }
  }

  if (task.status === "doing") {
    score += 8;
  }

  if (task.estimate <= 30) {
    score += 10;
  } else if (task.estimate <= 60) {
    score += 6;
  } else if (task.estimate <= 120) {
    score += 3;
  }

  return Math.min(100, score);
}

function formatDate(dateString) {
  if (!dateString) return "بدون موعد";
  const due = parseDueDate(dateString);
  return new Intl.DateTimeFormat("fa-IR-u-nu-latn", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(due);
}

function formatEstimate(minutes) {
  const value = Number(minutes);
  if (value < 60) return `${value} دقیقه`;
  if (value === 60) return "۱ ساعت";
  if (value === 120) return "۲ ساعت";
  return "۴+ ساعت";
}

function setTodayLabel() {
  todayLabel.textContent = new Intl.DateTimeFormat("fa-IR", {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(new Date());
}

function createTaskFromForm() {
  const data = new FormData(taskForm);
  return normalizeTask({
    id: createTaskId(),
    title: data.get("title"),
    category: data.get("category"),
    priority: data.get("priority"),
    dueDate: data.get("dueDate"),
    estimate: data.get("estimate"),
    notes: data.get("notes"),
    status: "backlog",
    createdAt: new Date().toISOString(),
  });
}

function addTask(task) {
  tasks.unshift(task);
  saveTasks();
  render();
}

function deleteTask(taskId) {
  tasks = tasks.filter((task) => task.id !== taskId);
  if (focusTaskId === taskId) {
    clearFocusTask();
  }
  saveTasks();
  render();
}

function setTaskStatus(taskId, status) {
  tasks = tasks.map((task) => {
    if (task.id !== taskId) return task;
    return {
      ...task,
      status,
      completedAt: status === "done" ? new Date().toISOString() : null,
    };
  });
  saveTasks();
  render();
}

function updateTask(updatedTask) {
  tasks = tasks.map((task) =>
    task.id === updatedTask.id ? normalizeTask(updatedTask) : task,
  );
  saveTasks();
  render();
}

function filteredTasks() {
  let result = [...tasks];

  if (currentFilter === "open") {
    result = result.filter((task) => task.status !== "done");
  } else if (currentFilter === "today") {
    result = result.filter((task) => task.status !== "done" && isToday(task));
  } else if (currentFilter === "overdue") {
    result = result.filter(isOverdue);
  } else if (currentFilter === "done") {
    result = result.filter((task) => task.status === "done");
  }

  if (searchQuery) {
    const query = searchQuery.toLocaleLowerCase("fa");
    result = result.filter((task) =>
      [task.title, task.category, task.notes]
        .join(" ")
        .toLocaleLowerCase("fa")
        .includes(query),
    );
  }

  if (sortSelect.value === "focus") {
    result.sort((a, b) => focusScore(b) - focusScore(a));
  } else if (sortSelect.value === "due") {
    result.sort((a, b) => {
      if (!a.dueDate && !b.dueDate) return 0;
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return parseDueDate(a.dueDate) - parseDueDate(b.dueDate);
    });
  } else {
    result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  return result;
}

function createStatusButtons(task) {
  const wrapper = document.createElement("div");
  wrapper.className = "task-status";

  const statuses = [
    ["backlog", "صف"],
    ["doing", "در حال انجام"],
    ["done", "انجام شد"],
  ];

  statuses.forEach(([status, label]) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = label;
    button.dataset.action = "status";
    button.dataset.status = status;
    button.disabled = task.status === status;
    wrapper.append(button);
  });

  return wrapper;
}

function createTaskCard(task) {
  const card = document.createElement("article");
  card.className = `task-card ${task.status === "done" ? "done" : ""}`;
  card.dataset.id = task.id;

  const statusControls = createStatusButtons(task);

  const content = document.createElement("div");
  content.className = "task-card__content";

  const title = document.createElement("h4");
  title.textContent = task.title;

  const meta = document.createElement("div");
  meta.className = "task-card__meta";

  const dueText = document.createElement("span");
  dueText.textContent = `موعد: ${formatDate(task.dueDate)}`;

  const estimateText = document.createElement("span");
  estimateText.textContent = `زمان: ${formatEstimate(task.estimate)}`;

  const statusText = document.createElement("span");
  statusText.textContent = `وضعیت: ${statusLabels[task.status]}`;

  meta.append(dueText, estimateText, statusText);

  const notes = document.createElement("p");
  notes.className = "task-card__notes";
  notes.textContent = task.notes || "بدون یادداشت";

  const tags = document.createElement("div");
  tags.className = "task-card__tags";

  const priorityTag = document.createElement("span");
  priorityTag.className = `tag tag--${task.priority}`;
  priorityTag.textContent = `اولویت ${priorityLabels[task.priority]}`;

  tags.append(priorityTag);

  if (task.category) {
    const categoryTag = document.createElement("span");
    categoryTag.className = "tag";
    categoryTag.textContent = task.category;
    tags.append(categoryTag);
  }

  if (isOverdue(task)) {
    const overdueTag = document.createElement("span");
    overdueTag.className = "tag tag--critical";
    overdueTag.textContent = "عقب‌افتاده";
    tags.append(overdueTag);
  } else if (isToday(task) && task.status !== "done") {
    const todayTag = document.createElement("span");
    todayTag.className = "tag tag--high";
    todayTag.textContent = "امروز";
    tags.append(todayTag);
  }

  const actions = document.createElement("div");
  actions.className = "task-card__actions";

  const focusButton = document.createElement("button");
  focusButton.type = "button";
  focusButton.dataset.action = "focus";
  focusButton.textContent = "تمرکز";

  const editButton = document.createElement("button");
  editButton.type = "button";
  editButton.dataset.action = "edit";
  editButton.textContent = "ویرایش";

  const deleteButton = document.createElement("button");
  deleteButton.type = "button";
  deleteButton.dataset.action = "delete";
  deleteButton.textContent = "حذف";

  actions.append(focusButton, editButton, deleteButton);
  content.append(title, meta, notes, tags, actions);

  const score = document.createElement("div");
  score.className = "task-score";

  const scoreValue = document.createElement("strong");
  scoreValue.textContent = focusScore(task);

  const scoreLabel = document.createElement("small");
  scoreLabel.textContent = "FOCUS";

  score.append(scoreValue, scoreLabel);
  card.append(statusControls, content, score);

  return card;
}

function renderTaskList() {
  const visibleTasks = filteredTasks();
  taskList.replaceChildren();

  if (visibleTasks.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent =
      "کاری با این فیلتر پیدا نشد. یک کار جدید بساز یا فیلتر را تغییر بده.";
    taskList.append(empty);
  } else {
    visibleTasks.forEach((task) => taskList.append(createTaskCard(task)));
  }

  resultCount.textContent = `${visibleTasks.length} کار`;
}

function renderFocusList() {
  const suggestions = tasks
    .filter((task) => task.status !== "done")
    .sort((a, b) => focusScore(b) - focusScore(a))
    .slice(0, 3);

  focusList.replaceChildren();

  if (suggestions.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = "بعد از افزودن کارها، پیشنهاد تمرکز اینجا ظاهر می‌شود.";
    focusList.append(empty);
    return;
  }

  suggestions.forEach((task, index) => {
    const item = document.createElement("div");
    item.className = "focus-item";

    const rank = document.createElement("span");
    rank.className = "focus-item__rank";
    rank.textContent = index + 1;

    const text = document.createElement("div");

    const title = document.createElement("h4");
    title.textContent = task.title;

    const detail = document.createElement("p");
    detail.textContent = `${priorityLabels[task.priority]} • ${formatDate(task.dueDate)} • ${formatEstimate(task.estimate)}`;

    text.append(title, detail);

    const score = document.createElement("span");
    score.className = "focus-score";
    score.textContent = `${focusScore(task)}/100`;

    item.append(rank, text, score);
    focusList.append(item);
  });
}

function renderStats() {
  const openTasks = tasks.filter((task) => task.status !== "done");
  const todayTasks = openTasks.filter(isToday);
  const overdueTasks = openTasks.filter(isOverdue);
  const doneTasks = tasks.filter((task) => task.status === "done");

  statOpen.textContent = openTasks.length;
  statToday.textContent = todayTasks.length;
  statOverdue.textContent = overdueTasks.length;

  const completionRate = tasks.length
    ? Math.round((doneTasks.length / tasks.length) * 100)
    : 0;
  statCompletion.textContent = `${completionRate}%`;

  const topOpenTask = [...openTasks].sort(
    (a, b) => focusScore(b) - focusScore(a),
  )[0];
  const overallFocus = topOpenTask ? focusScore(topOpenTask) : 0;

  heroFocusScore.textContent = `${overallFocus}%`;
  heroProgressBar.style.width = `${overallFocus}%`;
  heroFocusCaption.textContent = topOpenTask
    ? `پیشنهاد اول: ${topOpenTask.title}`
    : "هنوز کاری اضافه نشده است.";

  clearCompletedButton.disabled = doneTasks.length === 0;
}

function updateActiveFilterButton() {
  filterButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.filter === currentFilter);
  });
}

function render() {
  renderStats();
  renderFocusList();
  renderTaskList();
  updateActiveFilterButton();
}

function openEditDialog(task) {
  editId.value = task.id;
  editTitle.value = task.title;
  editCategory.value = task.category;
  editPriority.value = task.priority;
  editDueDate.value = task.dueDate;
  editEstimate.value = task.estimate;
  editNotes.value = task.notes;
  editDialog.showModal();
}

function closeEditDialog() {
  editDialog.close();
}

function setFocusTask(taskId) {
  const task = tasks.find((item) => item.id === taskId);
  if (!task) return;

  focusTaskId = task.id;
  focusTaskName.textContent = task.title;
  focusTaskMeta.textContent = `${priorityLabels[task.priority]} • ${formatDate(task.dueDate)} • Focus Score: ${focusScore(task)}`;
  resetTimer();
  document
    .querySelector("#focus-mode")
    .scrollIntoView({ behavior: "smooth", block: "center" });
}

function clearFocusTask() {
  focusTaskId = null;
  focusTaskName.textContent = "یک کار را برای تمرکز انتخاب کن";
  focusTaskMeta.textContent = "از دکمه «تمرکز» روی هر کار استفاده کن.";
  resetTimer();
}

function updateTimerDisplay() {
  const minutes = Math.floor(timerSeconds / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (timerSeconds % 60).toString().padStart(2, "0");
  timerDisplay.textContent = `${minutes}:${seconds}`;
}

function startTimer() {
  if (!focusTaskId || timerInterval) return;

  timerInterval = window.setInterval(() => {
    timerSeconds -= 1;
    updateTimerDisplay();

    if (timerSeconds <= 0) {
      window.clearInterval(timerInterval);
      timerInterval = null;
      timerSeconds = 0;
      updateTimerDisplay();
      focusTaskMeta.textContent =
        "جلسه تمرکز تمام شد. یک استراحت کوتاه داشته باش.";
    }
  }, 1000);
}

function pauseTimer() {
  if (!timerInterval) return;
  window.clearInterval(timerInterval);
  timerInterval = null;
}

function resetTimer() {
  pauseTimer();
  timerSeconds = 25 * 60;
  updateTimerDisplay();
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem(THEME_KEY, theme);
}

function loadTheme() {
  const savedTheme = localStorage.getItem(THEME_KEY);
  if (savedTheme === "dark" || savedTheme === "light") {
    applyTheme(savedTheme);
    return;
  }

  const prefersDark = window.matchMedia?.(
    "(prefers-color-scheme: dark)",
  ).matches;
  applyTheme(prefersDark ? "dark" : "light");
}

function exportTasks() {
  const payload = {
    app: "FocusForge",
    version: 1,
    exportedAt: new Date().toISOString(),
    tasks,
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `focusforge-backup-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

async function importTasks(file) {
  try {
    const text = await file.text();
    const parsed = JSON.parse(text);
    const importedTasks = Array.isArray(parsed) ? parsed : parsed.tasks;

    if (!Array.isArray(importedTasks)) {
      throw new Error("Invalid backup format");
    }

    const normalized = importedTasks
      .map(normalizeTask)
      .filter((task) => task.title);

    if (!normalized.length) {
      throw new Error("No valid tasks");
    }

    tasks = normalized;
    saveTasks();
    render();
  } catch (error) {
    alert("فایل انتخاب‌شده یک خروجی معتبر FocusForge نیست.");
    console.error(error);
  } finally {
    importInput.value = "";
  }
}

taskForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const task = createTaskFromForm();

  if (task.title.length < 2) {
    showMessage("عنوان کار باید حداقل دو حرف داشته باشد.");
    return;
  }

  addTask(task);
  taskForm.reset();
  document.querySelector("#task-priority").value = "medium";
  document.querySelector("#task-estimate").value = "30";
  showMessage("");
  document.querySelector("#task-title").focus();
});

taskList.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;

  const card = button.closest(".task-card");
  if (!card) return;

  const task = tasks.find((item) => item.id === card.dataset.id);
  if (!task) return;

  const action = button.dataset.action;

  if (action === "delete") {
    const confirmed = window.confirm(`«${task.title}» حذف شود؟`);
    if (confirmed) deleteTask(task.id);
  } else if (action === "edit") {
    openEditDialog(task);
  } else if (action === "status") {
    setTaskStatus(task.id, button.dataset.status);
  } else if (action === "focus") {
    setFocusTask(task.id);
  }
});

filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    currentFilter = button.dataset.filter;
    render();
  });
});

searchInput.addEventListener("input", () => {
  searchQuery = searchInput.value.trim();
  renderTaskList();
});

sortSelect.addEventListener("change", renderTaskList);

clearCompletedButton.addEventListener("click", () => {
  const completedCount = tasks.filter((task) => task.status === "done").length;
  if (!completedCount) return;

  const confirmed = window.confirm(`${completedCount} کار انجام‌شده حذف شود؟`);
  if (!confirmed) return;

  tasks = tasks.filter((task) => task.status !== "done");
  saveTasks();
  render();
});

editForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const original = tasks.find((task) => task.id === editId.value);
  if (!original) return;

  const updated = {
    ...original,
    title: editTitle.value.trim(),
    category: editCategory.value.trim(),
    priority: editPriority.value,
    dueDate: editDueDate.value,
    estimate: Number(editEstimate.value),
    notes: editNotes.value.trim(),
  };

  if (updated.title.length < 2) return;

  updateTask(updated);
  closeEditDialog();
});

closeDialog.addEventListener("click", closeEditDialog);
cancelEdit.addEventListener("click", closeEditDialog);

timerStart.addEventListener("click", startTimer);
timerPause.addEventListener("click", pauseTimer);
timerReset.addEventListener("click", resetTimer);

themeToggle.addEventListener("click", () => {
  const nextTheme =
    document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  applyTheme(nextTheme);
});

exportButton.addEventListener("click", exportTasks);

importInput.addEventListener("change", () => {
  const file = importInput.files?.[0];
  if (file) importTasks(file);
});

setTodayLabel();
loadTheme();
updateTimerDisplay();
render();

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');
const MEMORY_FILE = path.join(DATA_DIR, 'memory.json');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function loadAll() {
  try {
    ensureDataDir();
    if (!fs.existsSync(MEMORY_FILE)) return {};
    const raw = fs.readFileSync(MEMORY_FILE, 'utf8');
    return JSON.parse(raw || '{}');
  } catch (err) {
    console.error('[memory] loadAll error', err);
    return {};
  }
}

function saveAll(obj) {
  try {
    ensureDataDir();
    fs.writeFileSync(MEMORY_FILE, JSON.stringify(obj, null, 2), 'utf8');
  } catch (err) {
    console.error('[memory] saveAll error', err);
  }
}

function getConversation(userId) {
  const all = loadAll();
  return all[userId] || [];
}

function addEntry(userId, role, content) {
  if (!userId) userId = 'anonymous';
  const all = loadAll();
  all[userId] = all[userId] || [];
  all[userId].push({ role, content, timestamp: new Date().toISOString() });
  // Keep memory capped to last 50 messages per user to avoid unbounded growth
  if (all[userId].length > 50) {
    all[userId] = all[userId].slice(-50);
  }
  saveAll(all);
}

function getRecent(userId, limit = 8) {
  const convo = getConversation(userId);
  if (!Array.isArray(convo)) return [];
  return convo.slice(-limit);
}

function clearMemory(userId) {
  const all = loadAll();
  delete all[userId];
  saveAll(all);
}

module.exports = {
  getConversation,
  addEntry,
  getRecent,
  clearMemory,
};

document.addEventListener('DOMContentLoaded', () => {
  const desktop = document.getElementById('desktop');
  const windows = Array.from(document.querySelectorAll('.window'));
  const iconsContainer = document.getElementById('icons');
  const icons = Array.from(document.querySelectorAll('.icon'));
  const taskButtons = document.getElementById('task-buttons');
  const clockEl = document.getElementById('clock');

  let zIndexCounter = 1000;

  windows.forEach(w => {
    if (!w.style.display) w.style.display = 'none';
    w.dataset.max = w.dataset.max || 'false';
    w.dataset.full = w.dataset.full || 'false';
    w.dataset.minimized = 'false';
  });

  icons.forEach(icon => {
    icon.addEventListener('dblclick', () => {
      const app = icon.dataset.app;
      if (app && typeof window.openApp === 'function') window.openApp(app);
    });
    icon.addEventListener('click', () => {
      icons.forEach(i => i.classList.remove('selected'));
      icon.classList.add('selected');
    });
  });

  function updateClock() {
    if (!clockEl) return;
    const d = new Date();
    clockEl.textContent = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  updateClock();
  setInterval(updateClock, 1000);

  function bringToFront(el) {
    if (!el) return;
    zIndexCounter++;
    el.style.zIndex = zIndexCounter;
  }

  function openApp(appId) {
    const win = document.getElementById(appId);
    if (!win) return;
    win.style.display = 'flex';
    win.dataset.minimized = 'false';
    bringToFront(win);
    addTaskButton(appId);
  }

  function closeApp(appId) {
    const win = document.getElementById(appId);
    if (!win) return;
    if (win.dataset.full === 'true') exitFullscreen(win);
    win.style.display = 'none';
    win.dataset.minimized = 'false';
    removeTaskButton(appId);
  }

  function minimizeApp(appId) {
    const win = document.getElementById(appId);
    if (!win) return;
    win.dataset.minimized = 'true';
    win.style.display = 'none';
  }

  function addTaskButton(appId, label) {
    if (!taskButtons) return;
    if (document.querySelector(`#task-buttons button[data-app="${appId}"]`)) return;
    const btn = document.createElement('button');
    btn.className = 'task-btn';
    btn.dataset.app = appId;
    btn.type = 'button';
    btn.textContent = label || appId;
    btn.title = label || appId;

    btn.addEventListener('click', () => {
      const win = document.getElementById(appId);
      if (!win) return;
      const isHidden = getComputedStyle(win).display === 'none';
      if (isHidden) {
        win.style.display = 'flex';
        win.dataset.minimized = 'false';
        bringToFront(win);
      } else {
        win.dataset.minimized = 'true';
        win.style.display = 'none';
      }
    });

    btn.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      closeApp(appId);
    });

    taskButtons.appendChild(btn);
  }

  function removeTaskButton(appId) {
    const btn = document.querySelector(`#task-buttons button[data-app="${appId}"]`);
    if (btn) btn.remove();
  }

  windows.forEach(win => {
    const closeBtn = win.querySelector('.close');
    const minBtn = win.querySelector('.min');
    const fsBtn = win.querySelector('.fs');
    const titlebar = win.querySelector('.titlebar');

    if (closeBtn) {
      closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        closeApp(win.id);
      });
    }
    if (minBtn) {
      minBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        minimizeApp(win.id);
      });
    }
    if (fsBtn) {
      fsBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleFullscreen(win);
      });
    }

    win.addEventListener('mousedown', () => bringToFront(win));
    titlebar?.addEventListener('dblclick', (e) => {
      e.stopPropagation();
      toggleFullscreen(win);
    });
  });

  function toggleFullscreen(win) {
    if (!win) return;
    if (win.dataset.full === 'true') exitFullscreen(win);
    else enterFullscreen(win);
  }

  function enterFullscreen(win) {
    win.dataset.prevLeft = win.style.left || win.getBoundingClientRect().left + 'px';
    win.dataset.prevTop = win.style.top || win.getBoundingClientRect().top + 'px';
    win.dataset.prevWidth = win.style.width || win.getBoundingClientRect().width + 'px';
    win.dataset.prevHeight = win.style.height || win.getBoundingClientRect().height + 'px';
    win.classList.add('fullscreen');
    win.dataset.full = 'true';
    bringToFront(win);
  }

  function exitFullscreen(win) {
    win.classList.remove('fullscreen');
    win.dataset.full = 'false';
    if (win.dataset.prevLeft) win.style.left = win.dataset.prevLeft;
    if (win.dataset.prevTop) win.style.top = win.dataset.prevTop;
    if (win.dataset.prevWidth) win.style.width = win.dataset.prevWidth;
    if (win.dataset.prevHeight) win.style.height = win.dataset.prevHeight;
    win.style.resize = 'both';
    bringToFront(win);
  }

  let dragState = null;
  desktop.addEventListener('pointerup', () => { dragState = null; });

  windows.forEach(win => {
    const title = win.querySelector('.titlebar');
    if (!title) return;
    title.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      if (e.target.closest('.controls')) return;
      if (win.dataset.full === 'true') return;
      bringToFront(win);
      const rect = win.getBoundingClientRect();
      dragState = {
        el: win,
        startX: e.clientX,
        startY: e.clientY,
        origLeft: rect.left,
        origTop: rect.top
      };
      try { title.setPointerCapture(e.pointerId); } catch {}
      e.preventDefault();
    });
  });

  desktop.addEventListener('pointermove', (e) => {
    if (!dragState) return;
    const dx = e.clientX - dragState.startX;
    const dy = e.clientY - dragState.startY;
    dragState.el.style.left = (dragState.origLeft + dx) + 'px';
    dragState.el.style.top = (dragState.origTop + dy) + 'px';
  });

  let stopwatchInterval = null;
  let stopwatchStart = null;
  let elapsed = 0;
  const timerEl = document.getElementById('timer');
  const startBtn = document.getElementById('startBtn');
  const resetBtn = document.getElementById('resetBtn');

  function formatTime(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  }

  function updateStopwatchDisplay() {
    if (timerEl) timerEl.textContent = formatTime(elapsed);
  }

  if (startBtn) {
    startBtn.addEventListener('click', () => {
      if (stopwatchInterval) {
        clearInterval(stopwatchInterval);
        stopwatchInterval = null;
        elapsed += Date.now() - stopwatchStart;
        startBtn.textContent = 'Start';
      } else {
        stopwatchStart = Date.now();
        stopwatchInterval = setInterval(() => {
          const now = Date.now();
          const total = elapsed + (now - stopwatchStart);
          timerEl.textContent = formatTime(total);
        }, 1000);
        startBtn.textContent = 'Stop';
      }
    });
  }

  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      clearInterval(stopwatchInterval);
      stopwatchInterval = null;
      elapsed = 0;
      stopwatchStart = null;
      startBtn.textContent = 'Start';
      updateStopwatchDisplay();
    });
  }

  updateStopwatchDisplay();

const noteArea = document.getElementById('noteArea');
if (noteArea) {
  const saved = localStorage.getItem('pixelos-notepad');
  if (saved) {
    noteArea.value = saved;
  } else {
    noteArea.value =
      "Welcome to Pixel OS!\n\n" +
      "Some websites may not open inside the browser window because sites like YouTube and Google block embedding with X-Frames.\n\n" +
      "You can still use Notepad, Paint, Terminal, and other apps freely.";
    localStorage.setItem('pixelos-notepad', noteArea.value);
  }

  noteArea.addEventListener('input', () => {
    localStorage.setItem('pixelos-notepad', noteArea.value);
  });

  openApp('notepad');
}

  const canvas = document.getElementById('paintCanvas');
  const ctx = canvas?.getContext('2d');
  const colorPicker = document.getElementById('colorPicker');
  const brushSize = document.getElementById('brushSize');
  const clearBtn = document.getElementById('clearCanvas');
  if (canvas && ctx) {
    let painting = false;
    function getPointerPos(e) {
      const rect = canvas.getBoundingClientRect();
      return {
        x: Math.floor((e.clientX - rect.left) * (canvas.width / rect.width)),
        y: Math.floor((e.clientY - rect.top) * (canvas.height / rect.height))
      };
    }
    canvas.addEventListener('pointerdown', (e) => { painting = true; draw(e); });
    canvas.addEventListener('pointerup', () => painting = false);
    canvas.addEventListener('pointerleave', () => painting = false);
    canvas.addEventListener('pointermove', draw);
    function draw(e) {
      if (!painting) return;
      const p = getPointerPos(e);
      ctx.fillStyle = colorPicker?.value || '#000';
      const size = parseInt(brushSize?.value, 10) || 4;
      ctx.fillRect(p.x - Math.floor(size / 2), p.y - Math.floor(size / 2), size, size);
    }
    clearBtn?.addEventListener('click', () => ctx.clearRect(0, 0, canvas.width, canvas.height));
  }

const sessionFiles = new Map();
function uid(prefix = '') { return prefix + Math.random().toString(36).slice(2, 9); }

function saveNoteToDesktop(filename) {
  const noteArea = document.getElementById('noteArea');
  if (!noteArea) return alert('Notepad not found.');
  const text = noteArea.value || '';
  const id = uid('f_');
  const name = (filename || `note-${new Date().toISOString().slice(11, 19).replace(/:/g, '')}`);
  const file = { id, name: name + '.txt', type: 'text', data: text, createdAt: Date.now() };
  sessionFiles.set(id, file);
  createDesktopFileIcon(file);
}

function saveCanvasToDesktop(filename) {
  const canvas = document.getElementById('paintCanvas');
  const ctx = canvas?.getContext('2d');
  if (!canvas || !ctx) return alert('Canvas not found.');
  const dataURL = canvas.toDataURL('image/png');
  const id = uid('f_');
  const name = (filename || `image-${new Date().toISOString().slice(11, 19).replace(/:/g, '')}`);
  const file = { id, name: name + '.png', type: 'image', data: dataURL, createdAt: Date.now() };
  sessionFiles.set(id, file);
  createDesktopFileIcon(file);
}

function ensureSaveControls() {
  const notepadWin = document.getElementById('notepad');
  if (notepadWin && !notepadWin.querySelector('.app-toolbar')) {
    const toolbar = document.createElement('div');
    toolbar.className = 'app-toolbar';
    const saveBtn = document.createElement('button');
    saveBtn.textContent = 'Save to Desktop';
    const saveAsBtn = document.createElement('button');
    saveAsBtn.textContent = 'Save As...';
    toolbar.appendChild(saveBtn);
    toolbar.appendChild(saveAsBtn);
    notepadWin.querySelector('.content').prepend(toolbar);

    saveBtn.addEventListener('click', () => saveNoteToDesktop());
    saveAsBtn.addEventListener('click', () => {
      const name = prompt('Filename (no extension):', `note-${new Date().toISOString().slice(0, 10)}`);
      if (name) saveNoteToDesktop(name);
    });
  }

  const paintWin = document.getElementById('paint');
  if (paintWin && !paintWin.querySelector('.app-toolbar')) {
    const toolbar = document.createElement('div');
    toolbar.className = 'app-toolbar';
    const saveBtn = document.createElement('button');
    saveBtn.textContent = 'Save Image to Desktop';
    const saveAsBtn = document.createElement('button');
    saveAsBtn.textContent = 'Save As...';
    toolbar.appendChild(saveBtn);
    toolbar.appendChild(saveAsBtn);
    paintWin.querySelector('.content').prepend(toolbar);

    saveBtn.addEventListener('click', () => saveCanvasToDesktop());
    saveAsBtn.addEventListener('click', () => {
      const name = prompt('Filename (no extension):', `image-${new Date().toISOString().slice(0, 10)}`);
      if (name) saveCanvasToDesktop(name);
    });
  }
}
ensureSaveControls();


const wallpaperSelect = document.getElementById('wallpaperSelect');
const applyWallpaper = document.getElementById('applyWallpaper');
const resetWallpaper = document.getElementById('resetWallpaper');
const WALL_KEY = 'pixelos-wallpaper';

function applySavedWallpaper() {
  const saved = localStorage.getItem(WALL_KEY);
  if (saved) document.body.style.backgroundImage = `url('${saved}')`;
}
applySavedWallpaper();

applyWallpaper?.addEventListener('click', () => {
  const val = wallpaperSelect.value;
  document.body.style.backgroundImage = `url('${val}')`;
  localStorage.setItem(WALL_KEY, val);
});
resetWallpaper?.addEventListener('click', () => {
  document.body.style.backgroundImage = '';
  localStorage.removeItem(WALL_KEY);
});

const themeSelect = document.getElementById('themeSelect');
const applyThemeBtn = document.getElementById('applyTheme');
const resetThemeBtn = document.getElementById('resetTheme');
const THEME_KEY = 'pixelos-theme';

function applyTheme(name) {
  document.body.classList.remove('theme-blue', 'theme-red', 'theme-pink');
  const cls = `theme-${name || 'blue'}`;
  document.body.classList.add(cls);
  localStorage.setItem(THEME_KEY, name);
}
function loadSavedTheme() {
  const saved = localStorage.getItem(THEME_KEY) || 'blue';
  if (themeSelect) themeSelect.value = saved;
  applyTheme(saved);
}
loadSavedTheme();

applyThemeBtn?.addEventListener('click', () => {
  const val = themeSelect.value || 'blue';
  applyTheme(val);
});
resetThemeBtn?.addEventListener('click', () => {
  localStorage.removeItem(THEME_KEY);
  applyTheme('blue');
  if (themeSelect) themeSelect.value = 'blue';
});

function ensureSaveControls() {
  const notepadWin = document.getElementById('notepad');
  if (notepadWin && !notepadWin.querySelector('.app-toolbar')) {
    const toolbar = document.createElement('div');
    toolbar.className = 'app-toolbar';
    const saveBtn = document.createElement('button');
    saveBtn.textContent = 'Save to Desktop';
    const saveAsBtn = document.createElement('button');
    saveAsBtn.textContent = 'Save As...';
    toolbar.appendChild(saveBtn);
    toolbar.appendChild(saveAsBtn);
    notepadWin.querySelector('.content').prepend(toolbar);

    saveBtn.addEventListener('click', () => saveNoteToDesktop());
    saveAsBtn.addEventListener('click', () => {
      const name = prompt('Filename (no extension):', `note-${new Date().toISOString().slice(0, 10)}`);
      if (name) saveNoteToDesktop(name);
    });
  }

  const paintWin = document.getElementById('paint');
  if (paintWin && !paintWin.querySelector('.app-toolbar')) {
    const toolbar = document.createElement('div');
    toolbar.className = 'app-toolbar';
    const saveBtn = document.createElement('button');
    saveBtn.textContent = 'Save Image to Desktop';
    const saveAsBtn = document.createElement('button');
    saveAsBtn.textContent = 'Save As...';
    toolbar.appendChild(saveBtn);
    toolbar.appendChild(saveAsBtn);
    paintWin.querySelector('.content').prepend(toolbar);

    saveBtn.addEventListener('click', () => saveCanvasToDesktop());
    saveAsBtn.addEventListener('click', () => {
      const name = prompt('Filename (no extension):', `image-${new Date().toISOString().slice(0, 10)}`);
      if (name) saveCanvasToDesktop(name);
    });
  }
}
ensureSaveControls();

const terminalWin = document.getElementById('terminal');
const termOutput = terminalWin?.querySelector('.term-output');
const termInput = terminalWin?.querySelector('.term-input');

function termPrint(msg) {
  if (!termOutput) return;
  const div = document.createElement('div');
  div.textContent = msg;
  termOutput.appendChild(div);
  termOutput.scrollTop = termOutput.scrollHeight;
}

if (termInput) {
  termInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const cmd = termInput.value.trim();
      termInput.value = '';
      if (!cmd) return;

      termPrint(`user@pixelos:~$ ${cmd}`);

      if (cmd === 'help') {
        termPrint('Commands: help, time, program <name>, open <url>, clear');
      } else if (cmd === 'time') {
        termPrint(new Date().toString());
      } else if (cmd.startsWith('program ')) {
        const app = cmd.split(' ')[1];
        openApp(app);
      } else if (cmd.startsWith('open ')) {
        const url = cmd.split(' ')[1];
        openApp('browser');
        setTimeout(() => {
          window.navigateToWithErrorUI(url);
        }, 200);
      } else if (cmd === 'clear') {
        termOutput.innerHTML = '';
      } else {
        termPrint('Unknown command');
      }
    }
  });
}

function createTextIconDataURL(text) {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='64' height='64'>
    <rect width='100%' height='100%' fill='#fff' stroke='#003366' stroke-width='3' rx='6' />
    <text x='50%' y='55%' font-size='18' font-family='monospace' fill='#00264d' text-anchor='middle' dominant-baseline='middle'>${text}</text>
  </svg>`;
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}

function openFileFromDesktop(fileId) {
  const file = sessionFiles.get(fileId);
  if (!file) return alert('File not found.');

  if (file.type === 'text') {
    openApp('notepad');
    const area = document.getElementById('noteArea');
    if (area) area.value = file.data;
  } else if (file.type === 'image') {
    openApp('paint');
    const canvas = document.getElementById('paintCanvas');
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const ratio = Math.min(canvas.width / img.width, canvas.height / img.height);
      const w = img.width * ratio;
      const h = img.height * ratio;
      const x = Math.floor((canvas.width - w) / 2);
      const y = Math.floor((canvas.height - h) / 2);
      ctx.drawImage(img, x, y, w, h);
    };
    img.src = file.data;
  }
}


const appIcons = Array.from(document.querySelectorAll('.icon'));
appIcons.forEach(icon => {
  icon.addEventListener('dblclick', () => {
    const app = icon.dataset.app;
    if (app) window.openApp(app);
  });
});

function createDesktopFileIcon(file) {
  const iconsContainer = document.getElementById('icons');
  if (!iconsContainer) return;

  const wrapper = document.createElement('div');
  wrapper.className = 'file-icon';
  wrapper.dataset.fileId = file.id;

  const thumb = document.createElement('img');
  thumb.src = file.type === 'image' ? file.data : createTextIconDataURL('TXT');
  thumb.alt = file.name;

  const label = document.createElement('span');
  label.textContent = file.name;

  const del = document.createElement('div');
  del.className = 'file-delete-dot';
  del.textContent = '•'; 
  Object.assign(del.style, {
    position: 'absolute',
    top: '2px',
    right: '6px',
    cursor: 'pointer',
    color: 'red',
    fontWeight: 'bold'
  });
  del.title = 'Delete';
  del.addEventListener('click', (e) => {
    e.stopPropagation();
    if (confirm(`Delete "${file.name}" from desktop?`)) {
      sessionFiles.delete(file.id);
      wrapper.remove();
    }
  });

  wrapper.addEventListener('dblclick', () => openFileFromDesktop(file.id));

  wrapper.addEventListener('click', () => {
    document.querySelectorAll('.file-icon').forEach(el => el.classList.remove('selected'));
    wrapper.classList.add('selected');
  });

  wrapper.style.position = 'relative';
  wrapper.appendChild(thumb);
  wrapper.appendChild(label);
  wrapper.appendChild(del);
  iconsContainer.appendChild(wrapper);
}



(function browserApp() {
  const browserWin = document.getElementById('browser');
  if (!browserWin) return;

  const addressInput = browserWin.querySelector('.browser-address');
  const goBtn = browserWin.querySelector('.browser-go');
  const iframe = browserWin.querySelector('.browser-frame');
  const backBtn = browserWin.querySelector('.browser-back');
  const fwdBtn = browserWin.querySelector('.browser-forward');

  function normalizeUrl(input) {
    if (!input) return '';
    try { const u = new URL(input); return u.href; } catch { return 'https://' + input; }
  }

  function getEmbedUrlIfAvailable(rawUrl) {
    if (!rawUrl) return null;
    try {
      const u = new URL(rawUrl);
      const host = u.hostname.replace('www.', '').toLowerCase();
      if (host === 'youtube.com' || host === 'youtu.be') {
        let vid = null;
        if (host === 'youtu.be') vid = u.pathname.slice(1);
        else vid = u.searchParams.get('v');
        if (vid) return `https://www.youtube.com/embed/${vid}`;
      }
      if (host === 'vimeo.com') {
        const vid = u.pathname.split('/').filter(Boolean).pop();
        if (vid) return `https://player.vimeo.com/video/${vid}`;
      }
      return null;
    } catch { return null; }
  }

  function ensureNotificationContainer() {
    let container = document.querySelector('.pixelos-notification-area');
    if (!container) {
      container = document.createElement('div');
      container.className = 'pixelos-notification-area';
      Object.assign(container.style, {
        position: 'fixed',
        right: '12px',
        bottom: '72px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        zIndex: 99999,
        maxWidth: '360px',
        pointerEvents: 'none'
      });
      document.body.appendChild(container);
    }
    return container;
  }

  function showPixelNotification({ url, reason }) {
    const container = ensureNotificationContainer();
    const el = document.createElement('div');
    el.className = 'pixelos-notification';
    Object.assign(el.style, {
      background: 'rgba(0,0,0,0.85)',
      color: '#fff',
      padding: '10px',
      borderRadius: '8px',
      boxShadow: '0 8px 20px rgba(0,0,0,0.45)',
      fontFamily: 'monospace',
      fontSize: '13px',
      pointerEvents: 'auto'
    });
    el.textContent = `Embed blocked: ${reason} • ${url}`;
    container.prepend(el);
    setTimeout(() => el.remove(), 6000);
  }

  const historyStack = [];
  let historyIndex = -1;
  function pushHistory(href) {
    if (!href) return;
    if (historyStack[historyIndex] === href) return;
    historyStack.splice(historyIndex + 1);
    historyStack.push(href);
    historyIndex = historyStack.length - 1;
    updateNavButtons();
  }
  function updateNavButtons() {
    if (backBtn) backBtn.disabled = historyIndex <= 0;
    if (fwdBtn) fwdBtn.disabled = historyIndex >= historyStack.length - 1;
  }

  iframe.addEventListener('load', () => {
    try {
      const href = iframe.contentWindow.location.href;
      if (href && href !== 'about:blank') pushHistory(href);
    } catch {
      const href = addressInput.value;
      if (href) pushHistory(href);
    }
  });

  backBtn?.addEventListener('click', () => {
    if (historyIndex > 0) {
      historyIndex--;
      iframe.src = historyStack[historyIndex];
      addressInput.value = historyStack[historyIndex];
      updateNavButtons();
    }
  });
  fwdBtn?.addEventListener('click', () => {
    if (historyIndex < historyStack.length - 1) {
      historyIndex++;
      iframe.src = historyStack[historyIndex];
      addressInput.value = historyStack[historyIndex];
      updateNavButtons();
    }
  });

  function navigateToWithErrorUI(raw) {
    const href = normalizeUrl(raw);
    if (!href) return;
    addressInput.value = href;

    const embed = getEmbedUrlIfAvailable(href);
    const target = embed || href;

    if (iframe._errorTimer) { clearTimeout(iframe._errorTimer); iframe._errorTimer = null; }
    if (iframe._onLoadHandler) { iframe.removeEventListener('load', iframe._onLoadHandler); iframe._onLoadHandler = null; }

    let handled = false;
    iframe._onLoadHandler = function () {
      if (handled) return;
      handled = true;
      clearTimeout(iframe._errorTimer);
      try {
        const loc = iframe.contentWindow && iframe.contentWindow.location && iframe.contentWindow.location.href;
        if (loc && loc !== 'about:blank') {
          pushHistory(target);
          return;
        }
        if (loc === 'about:blank') {
          showPixelNotification({ url: href, reason: 'Site prevented embedding' });
        }
      } catch {
        pushHistory(target);
      }
    };
    iframe.addEventListener('load', iframe._onLoadHandler, { once: true });
    iframe.src = target;

    iframe._errorTimer = setTimeout(() => {
      if (handled) return;
      handled = true;
      showPixelNotification({ url: href, reason: 'Likely blocked by X-Frame-Options or CSP' });
    }, 2000);
  }

  goBtn?.addEventListener('click', () => navigateToWithErrorUI(addressInput.value));
  addressInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); navigateToWithErrorUI(addressInput.value); }
  });

  window.addEventListener('pixelos-browser-open', (e) => {
    const url = e.detail?.url;
    if (url) {
      if (typeof window.openApp === 'function') window.openApp('browser');
      setTimeout(() => navigateToWithErrorUI(url), 120);
    }
  });

  window.navigateToWithErrorUI = navigateToWithErrorUI;
})();

const taskbarStartBtn = document.getElementById('taskbar-start');
const startMenu = document.getElementById('start-menu');

taskbarStartBtn?.addEventListener('click', (e) => {
  e.stopPropagation();
  startMenu.classList.toggle('hidden');
  const expanded = !startMenu.classList.contains('hidden');
  taskbarStartBtn.setAttribute('aria-expanded', expanded ? 'true' : 'false');
});

document.addEventListener('click', (e) => {
  if (!startMenu.contains(e.target) && e.target !== taskbarStartBtn) {
    startMenu.classList.add('hidden');
    taskbarStartBtn.setAttribute('aria-expanded', 'false');
    startMenu.querySelectorAll('.submenu > ul').forEach(ul => ul.classList.remove('open'));
  }
});

startMenu.querySelectorAll('.submenu').forEach(section => {
  section.addEventListener('mouseenter', () => {
    startMenu.querySelectorAll('.submenu > ul').forEach(ul => ul.classList.remove('open'));
    const submenu = section.querySelector('ul');
    if (submenu) submenu.classList.add('open');
  });
  section.addEventListener('mouseleave', () => {
    const submenu = section.querySelector('ul');
    if (submenu) submenu.classList.remove('open');
  });
});

startMenu.querySelectorAll('[data-app]').forEach(item => {
  item.addEventListener('click', () => {
    const app = item.dataset.app;
    if (app) openApp(app);
    startMenu.classList.add('hidden');
    taskbarStartBtn.setAttribute('aria-expanded', 'false');
    startMenu.querySelectorAll('.submenu > ul').forEach(ul => ul.classList.remove('open'));
  });
});

const shutdownItem = document.getElementById('start-shutdown');
if (shutdownItem) {
  shutdownItem.addEventListener('click', () => {
    window.close(); 
  });
}

const logoutItem = document.getElementById('start-logout');
if (logoutItem) {
  logoutItem.addEventListener('click', () => {
    window.location.href = "./index.html"; 
  });
}

  window.openApp = openApp;
});

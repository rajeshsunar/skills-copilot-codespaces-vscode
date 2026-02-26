import { app, BrowserWindow, ipcMain, Menu, Tray, nativeImage } from 'electron';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isDev = !app.isPackaged;
let mainWindow;
let tray;

const defaultState = {
  window: {
    width: 300,
    height: 400,
    x: undefined,
    y: undefined,
    alwaysOnTop: true,
  },
  selectedNoteId: null,
  notes: [
    {
      id: crypto.randomUUID(),
      title: 'Welcome',
      content: 'Power Sticky is ready.\n- [ ] Create your first task',
      pinned: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ],
  settings: {
    theme: 'dark',
    launchOnStartup: false,
  },
};

function getStorePath() {
  return path.join(app.getPath('userData'), 'power-sticky.json');
}

async function loadState() {
  try {
    const raw = await fs.readFile(getStorePath(), 'utf8');
    const state = JSON.parse(raw);
    if (!state.selectedNoteId && state.notes?.[0]) {
      state.selectedNoteId = state.notes[0].id;
    }
    return state;
  } catch {
    const state = {
      ...defaultState,
      selectedNoteId: defaultState.notes[0].id,
    };
    await saveState(state);
    return state;
  }
}

async function saveState(state) {
  await fs.mkdir(app.getPath('userData'), { recursive: true });
  await fs.writeFile(getStorePath(), JSON.stringify(state, null, 2), 'utf8');
}

async function createWindow() {
  const state = await loadState();
  mainWindow = new BrowserWindow({
    width: state.window.width ?? 300,
    height: state.window.height ?? 400,
    x: state.window.x,
    y: state.window.y,
    minWidth: 260,
    minHeight: 300,
    alwaysOnTop: state.window.alwaysOnTop ?? true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (isDev) {
    await mainWindow.loadURL('http://localhost:5173');
  } else {
    await mainWindow.loadFile(path.join(process.cwd(), 'dist', 'index.html'));
  }

  mainWindow.on('resize', persistWindowBounds);
  mainWindow.on('move', persistWindowBounds);
  mainWindow.on('blur', () => mainWindow.webContents.send('app-window-blur'));

  mainWindow.on('close', (event) => {
    if (!app.isQuiting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });

  createTray();
}

async function persistWindowBounds() {
  if (!mainWindow) return;
  const state = await loadState();
  const bounds = mainWindow.getBounds();
  state.window = {
    ...state.window,
    ...bounds,
    alwaysOnTop: mainWindow.isAlwaysOnTop(),
  };
  await saveState(state);
}

function createTray() {
  if (tray) return;
  tray = new Tray(nativeImage.createEmpty());
  tray.setToolTip('Power Sticky');
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: 'Show', click: () => mainWindow.show() },
      {
        label: 'Always on top',
        type: 'checkbox',
        checked: mainWindow.isAlwaysOnTop(),
        click: () => {
          const next = !mainWindow.isAlwaysOnTop();
          mainWindow.setAlwaysOnTop(next);
          mainWindow.webContents.send('always-on-top-changed', next);
          persistWindowBounds();
        },
      },
      {
        label: 'Quit',
        click: () => {
          app.isQuiting = true;
          app.quit();
        },
      },
    ]),
  );
  tray.on('click', () => mainWindow.show());
}

ipcMain.handle('state:load', async () => loadState());
ipcMain.handle('state:save', async (_event, state) => {
  await saveState(state);
  return true;
});
ipcMain.handle('window:set-always-on-top', async (_event, value) => {
  mainWindow.setAlwaysOnTop(Boolean(value));
  await persistWindowBounds();
  return mainWindow.isAlwaysOnTop();
});
ipcMain.handle('window:minimize-to-tray', () => {
  mainWindow.hide();
  return true;
});
ipcMain.handle('startup:set', async (_event, enabled) => {
  app.setLoginItemSettings({ openAtLogin: Boolean(enabled) });
  const state = await loadState();
  state.settings.launchOnStartup = Boolean(enabled);
  await saveState(state);
  return state.settings.launchOnStartup;
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  } else {
    mainWindow.show();
  }
});

import { useEffect, useMemo, useState } from 'react';

const SAVE_DEBOUNCE_MS = 500;

function createNote() {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    title: 'Untitled note',
    content: '',
    pinned: false,
    createdAt: now,
    updatedAt: now,
  };
}

function getTitleFromContent(content) {
  const firstLine = content.split('\n').find((line) => line.trim().length > 0);
  return firstLine?.trim().slice(0, 40) || 'Untitled note';
}

function autoBullet(nextValue, prevValue) {
  if (!nextValue.endsWith('\n')) return nextValue;
  const prevLine = prevValue.split('\n').at(-1) ?? '';
  const checklist = /^\s*- \[( |x)\]\s/.exec(prevLine);
  if (checklist) return `${nextValue}${checklist[0].replace('[x]', '[ ]')}`;
  const bullet = /^\s*-\s+/.exec(prevLine);
  if (bullet) return `${nextValue}${bullet[0]}`;
  return nextValue;
}

export function App() {
  const [state, setState] = useState(null);
  const [query, setQuery] = useState('');
  const [saveStatus, setSaveStatus] = useState('Saved ✓');

  useEffect(() => {
    window.powerSticky.loadState().then((loaded) => setState(loaded));
    window.powerSticky.onBlur(() => flushSave());
    window.powerSticky.onAlwaysOnTopChanged((next) => {
      setState((prev) => ({ ...prev, window: { ...prev.window, alwaysOnTop: next } }));
    });
  }, []);

  useEffect(() => {
    if (!state) return;
    setSaveStatus('Saving…');
    const timer = setTimeout(async () => {
      await window.powerSticky.saveState(state);
      setSaveStatus('Saved ✓');
    }, SAVE_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [state]);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (!event.ctrlKey) return;
      if (event.key.toLowerCase() === 'n') {
        event.preventDefault();
        addNote();
      }
      if (event.key.toLowerCase() === 'd') {
        event.preventDefault();
        deleteNote(state.selectedNoteId);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  async function flushSave() {
    if (!state) return;
    await window.powerSticky.saveState(state);
    setSaveStatus('Saved ✓');
  }

  useEffect(() => {
    const onBeforeUnload = () => flushSave();
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  });

  if (!state) return <div className="loading">Loading…</div>;

  const notes = state.notes ?? [];
  const selected = notes.find((n) => n.id === state.selectedNoteId) ?? notes[0];
  const filteredNotes = useMemo(() => {
    const q = query.trim().toLowerCase();
    const sorted = [...notes].sort((a, b) => Number(b.pinned) - Number(a.pinned));
    if (!q) return sorted;
    return sorted.filter(
      (note) => note.title.toLowerCase().includes(q) || note.content.toLowerCase().includes(q),
    );
  }, [notes, query]);

  function updateNotes(nextNotes, nextSelectedId = state.selectedNoteId) {
    setState((prev) => ({ ...prev, notes: nextNotes, selectedNoteId: nextSelectedId }));
  }

  function addNote() {
    const note = createNote();
    updateNotes([note, ...notes], note.id);
  }

  function renameNote(id, title) {
    updateNotes(notes.map((note) => (note.id === id ? { ...note, title } : note)));
  }

  function deleteNote(id) {
    if (!id) return;
    if (!window.confirm('Delete this note permanently?')) return;
    const next = notes.filter((note) => note.id !== id);
    updateNotes(next, next[0]?.id ?? null);
  }

  function togglePin(id) {
    updateNotes(notes.map((note) => (note.id === id ? { ...note, pinned: !note.pinned } : note)));
  }

  function reorder(id, direction) {
    const idx = notes.findIndex((n) => n.id === id);
    const target = direction === 'up' ? idx - 1 : idx + 1;
    if (idx < 0 || target < 0 || target >= notes.length) return;
    const reordered = [...notes];
    [reordered[idx], reordered[target]] = [reordered[target], reordered[idx]];
    updateNotes(reordered);
  }

  function updateContent(value) {
    const content = autoBullet(value, selected.content);
    updateNotes(
      notes.map((note) =>
        note.id === selected.id
          ? {
              ...note,
              content,
              title: note.title === 'Untitled note' ? getTitleFromContent(content) : note.title,
              updatedAt: new Date().toISOString(),
            }
          : note,
      ),
    );
  }

  async function toggleAlwaysOnTop() {
    const next = !(state.window?.alwaysOnTop ?? true);
    const actual = await window.powerSticky.setAlwaysOnTop(next);
    setState((prev) => ({ ...prev, window: { ...prev.window, alwaysOnTop: actual } }));
  }

  async function toggleStartup() {
    const next = !state.settings.launchOnStartup;
    const actual = await window.powerSticky.setLaunchOnStartup(next);
    setState((prev) => ({ ...prev, settings: { ...prev.settings, launchOnStartup: actual } }));
  }

  function setTheme(theme) {
    setState((prev) => ({ ...prev, settings: { ...prev.settings, theme } }));
  }

  return (
    <div className={`app ${state.settings.theme}`}>
      <aside className="sidebar">
        <div className="toolbar">
          <button onClick={addNote}>+ Note</button>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search notes"
            aria-label="Search notes"
          />
        </div>
        <div className="note-list">
          {filteredNotes.map((note) => (
            <button
              key={note.id}
              className={`note-item ${note.id === selected?.id ? 'active' : ''}`}
              onClick={() => setState((prev) => ({ ...prev, selectedNoteId: note.id }))}
            >
              <div>{note.pinned ? '📌 ' : ''}{note.title}</div>
              <small>{new Date(note.updatedAt).toLocaleString()}</small>
            </button>
          ))}
        </div>
      </aside>

      <main className="editor-pane">
        <header>
          <input
            className="title-input"
            value={selected?.title ?? ''}
            onChange={(e) => renameNote(selected.id, e.target.value)}
          />
          <div className="actions">
            <button onClick={() => reorder(selected.id, 'up')}>↑</button>
            <button onClick={() => reorder(selected.id, 'down')}>↓</button>
            <button onClick={() => togglePin(selected.id)}>{selected?.pinned ? 'Unpin' : 'Pin'}</button>
            <button onClick={() => deleteNote(selected.id)}>Delete</button>
          </div>
        </header>
        <textarea
          value={selected?.content ?? ''}
          onChange={(e) => updateContent(e.target.value)}
          placeholder="Type your note here..."
        />
        <footer>
          <span>{saveStatus}</span>
          <div className="footer-toggles">
            <button onClick={toggleAlwaysOnTop}>
              {state.window.alwaysOnTop ? 'Always on Top: On' : 'Always on Top: Off'}
            </button>
            <button onClick={() => window.powerSticky.minimizeToTray()}>Minimize to Tray</button>
            <button onClick={toggleStartup}>
              Startup: {state.settings.launchOnStartup ? 'Enabled' : 'Disabled'}
            </button>
            <button
              onClick={() => setTheme(state.settings.theme === 'dark' ? 'yellow' : 'dark')}
            >
              Theme: {state.settings.theme}
            </button>
          </div>
        </footer>
      </main>
    </div>
  );
}

import assert from 'node:assert/strict';
import test from 'node:test';
import { readEditorPreferences, registerEditorThemes } from '../src/lib/editor-preferences.js';

const storage = values => ({ getItem: key => values[key] ?? null });

test('saved language, theme and indentation are restored with numeric tab width', () => {
    assert.deepEqual(readEditorPreferences(storage({
        cl_pref_lang: 'python', cl_editor_theme: 'monokai', cl_tab_size: '2', cl_keybinding: 'standard'
    })), { language: 'python', theme: 'monokai', tabSize: 2, keybinding: 'standard' });
});

test('new users retain the existing CodingLab theme and supported defaults', () => {
    assert.deepEqual(readEditorPreferences(storage({})), {
        language: 'cpp', theme: 'codinglab-dark', tabSize: 4, keybinding: 'standard'
    });
});

test('unsupported or corrupted saved settings fall back to usable values', () => {
    assert.deepEqual(readEditorPreferences(storage({
        cl_pref_lang: 'javascript', cl_editor_theme: 'unknown-theme', cl_tab_size: 'invalid', cl_keybinding: 'vim'
    })), { language: 'cpp', theme: 'codinglab-dark', tabSize: 4, keybinding: 'standard' });
});

test('blocked browser storage does not prevent opening an editor', () => {
    const preferences = readEditorPreferences({ getItem() { throw new Error('Storage unavailable'); } });
    assert.equal(preferences.language, 'cpp');
    assert.equal(preferences.theme, 'codinglab-dark');
    assert.equal(preferences.tabSize, 4);
});

test('all offered custom themes are registered before editor mounting', () => {
    const themes = new Map();
    registerEditorThemes({ editor: { defineTheme: (name, theme) => themes.set(name, theme) } });
    for (const name of ['codinglab-dark', 'monokai', 'github-dark', 'light']) {
        const preferences = readEditorPreferences(storage({ cl_editor_theme: name }));
        assert.ok(themes.has(preferences.theme));
    }
    assert.equal(themes.get('codinglab-dark').colors['editor.background'], '#020617');
    assert.equal(themes.get('light').base, 'vs');
});

export const editorLanguages = ['cpp', 'python', 'java'];
export const editorThemes = ['codinglab-dark', 'vs-dark', 'monokai', 'github-dark', 'light'];

export function readEditorPreferences(storage) {
    const defaults = { language: 'cpp', theme: 'codinglab-dark', tabSize: 4, keybinding: 'standard' };
    try {
        const saved = storage ?? globalThis.localStorage;
        const language = saved?.getItem('cl_pref_lang');
        const theme = saved?.getItem('cl_editor_theme');
        const tabSize = Number(saved?.getItem('cl_tab_size'));
        return {
            language: editorLanguages.includes(language) ? language : defaults.language,
            theme: editorThemes.includes(theme) ? theme : defaults.theme,
            tabSize: [2, 4].includes(tabSize) ? tabSize : defaults.tabSize,
            keybinding: 'standard'
        };
    } catch {
        return defaults;
    }
}

export function registerEditorThemes(monaco) {
    monaco.editor.defineTheme('codinglab-dark', {
        base: 'vs-dark', inherit: true, rules: [],
        colors: {
            'editor.background': '#020617',
            'editor.lineHighlightBackground': '#0f172a',
            'editorLineNumber.foreground': '#475569',
            'editorLineNumber.activeForeground': '#10b981'
        }
    });
    monaco.editor.defineTheme('monokai', {
        base: 'vs-dark', inherit: true,
        rules: [
            { token: 'comment', foreground: '75715E' },
            { token: 'keyword', foreground: 'F92672' },
            { token: 'string', foreground: 'E6DB74' },
            { token: 'number', foreground: 'AE81FF' }
        ],
        colors: {
            'editor.background': '#272822', 'editor.foreground': '#f8f8f2',
            'editor.lineHighlightBackground': '#3e3d32', 'editorCursor.foreground': '#f8f8f0',
            'editor.selectionBackground': '#49483e', 'editorLineNumber.foreground': '#90908a'
        }
    });
    monaco.editor.defineTheme('github-dark', {
        base: 'vs-dark', inherit: true,
        rules: [
            { token: 'comment', foreground: '8B949E' },
            { token: 'keyword', foreground: 'FF7B72' },
            { token: 'string', foreground: 'A5D6FF' },
            { token: 'number', foreground: '79C0FF' }
        ],
        colors: {
            'editor.background': '#0d1117', 'editor.foreground': '#c9d1d9',
            'editor.lineHighlightBackground': '#161b22', 'editorCursor.foreground': '#c9d1d9',
            'editor.selectionBackground': '#264f78', 'editorLineNumber.foreground': '#8b949e'
        }
    });
    monaco.editor.defineTheme('light', {
        base: 'vs', inherit: true, rules: [],
        colors: {
            'editor.background': '#f8fafc', 'editor.foreground': '#111827',
            'editor.lineHighlightBackground': '#ecfdf5', 'editorCursor.foreground': '#111827',
            'editor.selectionBackground': '#a7f3d0', 'editorLineNumber.foreground': '#64748b',
            'editorLineNumber.activeForeground': '#059669'
        }
    });
}

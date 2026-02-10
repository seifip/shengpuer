import React from 'react';

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/.test(navigator.platform);

const KEY_MAP_MAC: Record<string, string> = {
    Mod: '⌘',
    Ctrl: '⌃',
    Alt: '⌥',
    Shift: '⇧',
    Enter: '↩',
    Backspace: '⌫',
    Delete: '⌦',
    Escape: 'Esc',
    Space: '␣',
    ArrowUp: '↑',
    ArrowDown: '↓',
    ArrowLeft: '←',
    ArrowRight: '→',
    Tab: '⇥',
};

const KEY_MAP_OTHER: Record<string, string> = {
    Mod: 'Ctrl',
    Escape: 'Esc',
    Space: 'Space',
    ArrowUp: '↑',
    ArrowDown: '↓',
    ArrowLeft: '←',
    ArrowRight: '→',
};

function formatKey(key: string): string {
    const map = isMac ? KEY_MAP_MAC : KEY_MAP_OTHER;
    return map[key] || key;
}

export function Kbd({ keys }: { keys: string[] }) {
    return (
        <span className="inline-flex items-center gap-0.5 ml-2">
            {keys.map((key, i) => (
                <kbd
                    key={i}
                    className="inline-flex items-center justify-center min-w-[1.2em] px-1 py-0.5 rounded bg-white/10 text-[0.65rem] font-mono leading-none text-white/70"
                >
                    {formatKey(key)}
                </kbd>
            ))}
        </span>
    );
}

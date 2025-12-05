import React, { useEffect } from 'react';
import { Search, Settings } from 'lucide-react';

interface HeaderProps {
    onSearch: (query: string) => void;
    onOpenSettings: () => void;
    userName: string;
}

/**
 * Header component displaying the user greeting, search bar, and settings button.
 * Uses a sticky position to remain visible at the top of the viewport.
 */
export const Header: React.FC<HeaderProps> = ({ onSearch, onOpenSettings, userName }) => {
    const inputRef = React.useRef<HTMLInputElement>(null);

    // Global keyboard shortcut (Cmd+K) to focus search
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                inputRef.current?.focus();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return "Good morning";
        if (hour < 17) return "Good afternoon";
        if (hour < 21) return "Good evening";
        return "Good night";
    };

    return (
        <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container mx-auto flex h-16 items-center justify-between px-4 gap-4">
                {/* Left: Greeting */}
                <div className="hidden md:flex flex-col justify-center max-w-lg">
                    <div className="animate-in fade-in slide-in-from-left duration-500 flex items-center gap-3">
                        <div className="relative w-8 h-8 text-foreground">
                            <img src="/googly-eyes.svg" alt="Logo" className="w-full h-full object-contain" />
                        </div>
                        <h1 className="text-lg font-semibold text-foreground/90">
                            {getGreeting()}, <span className="text-primary">{userName}</span>
                        </h1>
                    </div>
                </div>

                {/* Right: Search & Settings */}
                <div className="flex items-center gap-3 flex-1 justify-end">
                    <div className="relative w-full max-w-md">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <input
                            ref={inputRef}
                            type="text"
                            placeholder="Search bookmarks... (Cmd+K)"
                            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 pl-9"
                            onChange={(e) => onSearch(e.target.value)}
                        />
                        <kbd className="pointer-events-none absolute right-2.5 top-2.5 hidden h-4 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100 sm:flex">
                            <span className="text-xs">⌘</span>K
                        </kbd>
                    </div>

                    <button
                        onClick={onOpenSettings}
                        className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-9 w-9 flex-shrink-0"
                    >
                        <Settings className="h-5 w-5" />
                        <span className="sr-only">Settings</span>
                    </button>
                </div>
            </div>
        </header>
    );
};

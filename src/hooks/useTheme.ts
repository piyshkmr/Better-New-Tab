import { useState, useEffect } from 'react';

interface ThemeSettings {
    theme: 'light' | 'dark' | 'system';
    accentColor: string;
    cardPreset: 'small' | 'medium' | 'default' | 'large';
    fontFamily: string;
}

const DEFAULT_SETTINGS: ThemeSettings = {
    theme: 'system',
    accentColor: 'bg-blue-500',
    cardPreset: 'default',
    fontFamily: 'system-ui',
};

export const useTheme = () => {
    const [settings, setSettings] = useState<ThemeSettings>(DEFAULT_SETTINGS);

    useEffect(() => {
        // Load settings from storage
        if (typeof chrome !== 'undefined' && chrome.storage) {
            chrome.storage.local.get(['themeSettings'], (result) => {
                if (result.themeSettings) {
                    const loaded = result.themeSettings as any;
                    // Migration: if old darkMode exists, map it
                    if (loaded.darkMode !== undefined) {
                        loaded.theme = loaded.darkMode ? 'dark' : 'light';
                        delete loaded.darkMode;
                    }
                    // Migration: if old cardSize exists, map it
                    if (loaded.cardSize) {
                        delete loaded.cardSize;
                        loaded.cardPreset = 'default';
                    }
                    setSettings(loaded as ThemeSettings);
                }
            });
        }
    }, []);

    useEffect(() => {
        // Apply settings to document
        const root = document.documentElement;

        const applyTheme = () => {
            let isDark = false;
            if (settings.theme === 'system') {
                isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            } else {
                isDark = settings.theme === 'dark';
            }

            if (isDark) {
                root.classList.add('dark');
            } else {
                root.classList.remove('dark');
            }
        };

        applyTheme();

        // Listen for system changes if theme is 'system'
        let mediaQuery: MediaQueryList | null = null;
        if (settings.theme === 'system') {
            mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
            mediaQuery.addEventListener('change', applyTheme);
        }

        return () => {
            if (mediaQuery) {
                mediaQuery.removeEventListener('change', applyTheme);
            }
        };
    }, [settings.theme]); // Only re-run if theme setting changes

    useEffect(() => {
        const root = document.documentElement;
        // Apply Accent Color

        // Apply Accent Color
        const colorMap: Record<string, string> = {
            'bg-blue-500': '217.2 91.2% 59.8%',
            'bg-green-500': '142.1 76.2% 36.3%',
            'bg-purple-500': '262.1 83.3% 57.8%',
            'bg-orange-500': '24.6 95% 53.1%',
            'bg-red-500': '0 84.2% 60.2%',
        };

        if (colorMap[settings.accentColor]) {
            root.style.setProperty('--primary', colorMap[settings.accentColor]);
            root.style.setProperty('--ring', colorMap[settings.accentColor]);
            // Enforce white text for better contrast on colorful backgrounds
            root.style.setProperty('--primary-foreground', '210 40% 98%');
        } else {
            // Revert to default if no accent (though we always have a default)
            // But if we ever support "no accent" or "monochrome", we'd need to handle this.
            // For now, our system always has an accent.
        }

        // Apply Card Presets
        const presets = {
            small: { width: '140px', icon: '16px', title: '13px', url: '10px', padding: '0.5rem' },
            medium: { width: '160px', icon: '20px', title: '14px', url: '11px', padding: '0.625rem' },
            default: { width: '180px', icon: '20px', title: '15px', url: '12px', padding: '0.75rem' },
            large: { width: '220px', icon: '32px', title: '16px', url: '13px', padding: '1rem' },
        };

        const currentPreset = presets[settings.cardPreset] || presets.default;

        root.style.setProperty('--card-width', currentPreset.width);
        root.style.setProperty('--card-icon-size', currentPreset.icon);
        root.style.setProperty('--card-title-size', currentPreset.title);
        root.style.setProperty('--card-url-size', currentPreset.url);
        root.style.setProperty('--card-padding', currentPreset.padding);

        // Apply Font
        const fontMap: Record<string, string> = {
            'system-ui': 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
            'sans': 'ui-sans-serif, system-ui, -apple-system, BlinkMacMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
            'serif': 'ui-serif, Georgia, Cambria, "Times New Roman", Times, serif',
        };

        const fontFamily = fontMap[settings.fontFamily] || fontMap['system-ui'];
        root.style.setProperty('--font-family', fontFamily);
        document.body.style.fontFamily = fontFamily;

        // Save settings
        if (typeof chrome !== 'undefined' && chrome.storage) {
            chrome.storage.local.set({ themeSettings: settings });
        }
    }, [settings]);

    const updateSettings = (newSettings: Partial<ThemeSettings>) => {
        setSettings(prev => ({ ...prev, ...newSettings }));
    };

    const resetSettings = () => {
        setSettings(DEFAULT_SETTINGS);
    };

    return { settings, updateSettings, resetSettings };
};

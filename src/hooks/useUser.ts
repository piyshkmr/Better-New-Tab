import { useState, useEffect } from 'react';

interface UserSettings {
    name: string;
}

/**
 * Hook to manage user settings (specifically the user's name).
 * Persists data to chrome.storage.local with a localStorage fallback for development.
 */
export const useUser = () => {
    const [name, setName] = useState<string>('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
            chrome.storage.local.get(['userSettings'], (result) => {
                if (chrome.runtime.lastError) {
                    console.error('Error loading user settings:', chrome.runtime.lastError);
                    setLoading(false);
                    return;
                }
                const settings = result.userSettings as UserSettings | undefined;
                if (settings && settings.name) {
                    setName(settings.name);
                }
                setLoading(false);
            });
        } else {
            // Dev fallback
            const localName = localStorage.getItem('userSettings_name');
            if (localName) setName(localName);
            setLoading(false);
        }
    }, []);

    const updateName = (newName: string) => {
        setName(newName);
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
            chrome.storage.local.set({ userSettings: { name: newName } }, () => {
                if (chrome.runtime.lastError) {
                    console.error('Error saving user settings:', chrome.runtime.lastError);
                    // Optionally revert state here if critical, but for now log it
                }
            });
        } else {
            localStorage.setItem('userSettings_name', newName);
        }
    };

    return { name, updateName, loading };
};

import React, { useState, useEffect } from 'react';
import { X, RotateCcw, Check } from 'lucide-react';
import { cn } from '../lib/utils';
import { useTheme } from '../hooks/useTheme';


interface SettingsPanelProps {
    isOpen: boolean;
    onClose: () => void;
    userName: string;
    onUpdateName: (name: string) => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({ isOpen, onClose, userName, onUpdateName }) => {
    const { settings, updateSettings, resetSettings } = useTheme();
    // Local state for "Apply" functionality
    const [localSettings, setLocalSettings] = useState(settings);
    const [localName, setLocalName] = useState(userName);

    // Sync local settings when panel opens or global settings change
    useEffect(() => {
        if (isOpen) {
            setLocalSettings(settings);
            setLocalName(userName);
        }
    }, [isOpen, settings, userName]);

    const handleApply = () => {
        updateSettings(localSettings);
        if (localName.trim() && localName !== userName) {
            onUpdateName(localName.trim());
        }
        onClose();
    };

    const handleReset = () => {
        resetSettings();
        // We probably don't want to reset the name, just the theme
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex justify-end bg-background/60 backdrop-blur-md">
            <div className="w-full max-w-sm h-full bg-background border-l shadow-xl p-6 overflow-y-auto animate-in slide-in-from-right duration-300 flex flex-col">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold">Settings</h2>
                    <button onClick={onClose} className="p-2 hover:bg-accent rounded-full">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="space-y-8 flex-1">
                    {/* User Profile */}
                    <section>
                        <h3 className="text-sm font-medium mb-3 text-muted-foreground">Profile</h3>
                        <div>
                            <label className="text-sm block mb-2">Display Name</label>
                            <input
                                type="text"
                                value={localName}
                                onChange={(e) => setLocalName(e.target.value)}
                                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                            />
                        </div>
                    </section>

                    {/* Theme Settings */}
                    <section>
                        <h3 className="text-sm font-medium mb-3 text-muted-foreground">Appearance</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="text-sm block mb-2">Theme</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {(['light', 'dark', 'system'] as const).map((mode) => (
                                        <button
                                            key={mode}
                                            onClick={() => setLocalSettings(prev => ({ ...prev, theme: mode }))}
                                            className={cn(
                                                "px-3 py-2 rounded-md text-sm border transition-all capitalize",
                                                localSettings.theme === mode
                                                    ? "bg-primary text-primary-foreground border-primary"
                                                    : "hover:bg-accent"
                                            )}
                                        >
                                            {mode}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="text-sm block mb-2">Accent Color</label>
                                <div className="flex gap-2 flex-wrap">
                                    {['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500', 'bg-red-500'].map(color => (
                                        <button
                                            key={color}
                                            className={cn(
                                                "w-8 h-8 rounded-full ring-offset-2 hover:ring-2 transition-all",
                                                color,
                                                localSettings.accentColor === color && "ring-2 ring-primary"
                                            )}
                                            onClick={() => setLocalSettings(prev => ({ ...prev, accentColor: color }))}
                                        />
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="text-sm block mb-2">Font Family</label>
                                <select
                                    className="w-full p-2 rounded-md border bg-background"
                                    value={localSettings.fontFamily}
                                    onChange={(e) => setLocalSettings(prev => ({ ...prev, fontFamily: e.target.value }))}
                                >
                                    <option value="system-ui">System UI</option>
                                    <option value="sans">Sans Serif</option>
                                    <option value="serif">Serif</option>
                                </select>
                            </div>
                        </div>
                    </section>

                    {/* Layout Settings */}
                    <section>
                        <h3 className="text-sm font-medium mb-3 text-muted-foreground">Card Size</h3>
                        <div className="grid grid-cols-2 gap-2">
                            {(['small', 'medium', 'default', 'large'] as const).map((preset) => (
                                <button
                                    key={preset}
                                    onClick={() => setLocalSettings(prev => ({ ...prev, cardPreset: preset }))}
                                    className={cn(
                                        "px-3 py-2 rounded-md text-sm border transition-all",
                                        localSettings.cardPreset === preset
                                            ? "bg-primary text-primary-foreground border-primary"
                                            : "hover:bg-accent"
                                    )}
                                >
                                    {preset.charAt(0).toUpperCase() + preset.slice(1)}
                                </button>
                            ))}
                        </div>
                    </section>
                </div>

                {/* Footer Actions */}
                <div className="pt-6 mt-6 border-t flex gap-3">
                    <button
                        onClick={handleReset}
                        className="flex-1 px-4 py-2 rounded-md border hover:bg-accent flex items-center justify-center gap-2 text-sm font-medium"
                    >
                        <RotateCcw className="w-4 h-4" />
                        Reset
                    </button>
                    <button
                        onClick={handleApply}
                        className="flex-1 px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 flex items-center justify-center gap-2 text-sm font-medium"
                    >
                        <Check className="w-4 h-4" />
                        Apply
                    </button>
                </div>
            </div>
        </div>
    );
};


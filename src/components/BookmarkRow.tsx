import React, { useState, useEffect } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, rectSortingStrategy } from '@dnd-kit/sortable';
import { ChevronDown, ChevronRight } from 'lucide-react';
import type { BookmarkNode } from '../types';
import { BookmarkCard } from './BookmarkCard';
import { cn } from '../lib/utils';

interface BookmarkRowProps {
    folder: BookmarkNode;
    onEdit: (bookmark: BookmarkNode) => void;
}

export const BookmarkRow: React.FC<BookmarkRowProps> = ({ folder, onEdit }) => {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const { setNodeRef } = useDroppable({
        id: folder.id,
        data: { type: 'folder', folder },
    });

    // Load collapsed state
    useEffect(() => {
        if (typeof chrome !== 'undefined' && chrome.storage) {
            chrome.storage.local.get(['collapsedFolders'], (result) => {
                const collapsed = (result.collapsedFolders as Record<string, boolean>) || {};
                if (collapsed[folder.id]) {
                    setIsCollapsed(true);
                }
            });
        }
    }, [folder.id]);

    const toggleCollapse = () => {
        const newState = !isCollapsed;
        setIsCollapsed(newState);

        // Save state
        if (typeof chrome !== 'undefined' && chrome.storage) {
            chrome.storage.local.get(['collapsedFolders'], (result) => {
                const collapsed = (result.collapsedFolders as Record<string, boolean>) || {};
                collapsed[folder.id] = newState;
                chrome.storage.local.set({ collapsedFolders: collapsed });
            });
        }
    };

    if (!folder.children || folder.children.length === 0) {
        return null;
    }

    return (
        <div className="mb-8">
            <h2 className="text-lg font-semibold mb-3 px-8 flex items-center gap-2 text-foreground/80 select-none transition-colors">
                <button
                    onClick={toggleCollapse}
                    className="p-1 hover:bg-accent rounded-md transition-colors cursor-pointer"
                >
                    {isCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </button>
                {folder.title}
                <span className="text-xs font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                    {folder.children.length}
                </span>
            </h2>

            {!isCollapsed && (
                <div
                    ref={setNodeRef}
                    className={cn(
                        "flex flex-wrap gap-4 px-8 pb-4 items-start",
                        "mx-0 transition-colors",
                    )}
                >
                    <SortableContext
                        items={folder.children.map(b => b.id)}
                        strategy={rectSortingStrategy}
                    >
                        {folder.children.map((bookmark) => (
                            <BookmarkCard
                                key={bookmark.id}
                                bookmark={bookmark}
                                onEdit={onEdit}
                            />
                        ))}
                    </SortableContext>
                </div>
            )}
        </div>
    );
};

import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { BookmarkNode } from '../types';
import { cn } from '../lib/utils';
import { Edit } from 'lucide-react';
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuTrigger,
} from "@radix-ui/react-context-menu";

interface BookmarkCardProps {
    bookmark: BookmarkNode;
    onEdit: (bookmark: BookmarkNode) => void;
    isOverlay?: boolean;
}

export const BookmarkCard: React.FC<BookmarkCardProps> = ({ bookmark, onEdit, isOverlay }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({
        id: bookmark.id,
        data: { type: 'bookmark', bookmark },
        disabled: isOverlay,
        animateLayoutChanges: () => false, // Disable layout animation to prevent glitches
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    const getFaviconUrl = (url?: string) => {
        if (!url) return '';
        // Use native Chrome favicon if available (extension mode)
        if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id) {
            const pageUrl = encodeURIComponent(url);
            return `chrome-extension://${chrome.runtime.id}/_favicon/?pageUrl=${pageUrl}&size=32`;
        }
        // Fallback
        try {
            const urlObj = new URL(url);
            return `https://www.google.com/s2/favicons?domain=${urlObj.hostname}&sz=32`;
        } catch {
            return '';
        }
    };

    /** Safely extracts hostname from a URL, returning empty string on failure */
    const getHostname = (url?: string): string => {
        if (!url) return '';
        try {
            return new URL(url).hostname;
        } catch {
            return '';
        }
    };

    if (isDragging && !isOverlay) {
        return (
            <div
                ref={setNodeRef}
                style={{
                    ...style,
                    width: 'var(--card-width, 180px)',
                    padding: 'var(--card-padding, 0.75rem)',
                }}
                className="rounded-lg border-2 border-dashed border-primary/50 bg-accent/30 opacity-100 transition-all duration-200 flex flex-col justify-between"
            >
                <div className="flex items-start justify-between w-full overflow-hidden opacity-0">
                    <div className="flex items-center gap-2 w-full">
                        <div
                            style={{
                                width: 'var(--card-icon-size, 24px)',
                                height: 'var(--card-icon-size, 24px)',
                            }}
                            className="flex-shrink-0"
                        />
                        <span
                            className="font-medium truncate flex-1 leading-tight"
                            style={{ fontSize: 'var(--card-title-size, 15px)' }}
                        >
                            {bookmark.title}
                        </span>
                    </div>
                </div>

                <div className="mt-2 opacity-0">
                    <p
                        className="text-muted-foreground truncate opacity-70 leading-tight"
                        style={{ fontSize: 'var(--card-url-size, 12px)' }}
                    >
                        {getHostname(bookmark.url)}
                    </p>
                </div>
            </div>
        );
    }

    return (
        <ContextMenu>
            <ContextMenuTrigger>
                <div
                    ref={setNodeRef}
                    style={{
                        ...style,
                        width: 'var(--card-width, 180px)',
                        padding: 'var(--card-padding, 0.75rem)',
                    }}
                    {...attributes}
                    {...listeners}
                    className={cn(
                        "rounded-lg border bg-card text-card-foreground shadow-sm hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between select-none",
                        "hover:border-primary/20"
                    )}
                    onClick={() => bookmark.url && window.open(bookmark.url, '_self')}
                >
                    <div className="flex items-start justify-between w-full overflow-hidden">
                        <div className="flex items-center gap-2 w-full">
                            {bookmark.url && (
                                <img
                                    src={getFaviconUrl(bookmark.url)}
                                    alt=""
                                    style={{
                                        width: 'var(--card-icon-size, 24px)',
                                        height: 'var(--card-icon-size, 24px)',
                                    }}
                                    className="rounded-sm flex-shrink-0"
                                    onError={(e) => {
                                        // Fallback to google S2 if native fails (e.g. dev mode)
                                        const img = e.target as HTMLImageElement;
                                        if (!img.src.includes('google.com')) {
                                            const hostname = getHostname(bookmark.url);
                                            if (hostname) {
                                                img.src = `https://www.google.com/s2/favicons?domain=${hostname}&sz=32`;
                                            } else {
                                                img.style.display = 'none';
                                            }
                                        } else {
                                            img.style.display = 'none';
                                        }
                                    }}
                                />
                            )}
                            <span
                                className="font-medium truncate flex-1 leading-tight"
                                style={{ fontSize: 'var(--card-title-size, 15px)' }}
                            >
                                {bookmark.title}
                            </span>
                        </div>
                    </div>

                    <div className="mt-2">
                        <p
                            className="text-muted-foreground truncate opacity-70 leading-tight"
                            style={{ fontSize: 'var(--card-url-size, 12px)' }}
                        >
                            {getHostname(bookmark.url)}
                        </p>
                    </div>
                </div>
            </ContextMenuTrigger>
            <ContextMenuContent className="w-48 bg-popover border rounded-md shadow-lg p-1 z-50">
                <ContextMenuItem
                    className="flex items-center gap-2 px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground rounded-sm cursor-pointer"
                    onClick={(e) => {
                        e.preventDefault();
                        onEdit(bookmark);
                    }}
                >
                    <Edit className="w-4 h-4" />
                    Edit
                </ContextMenuItem>
            </ContextMenuContent>
        </ContextMenu>
    );
};


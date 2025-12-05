import { useState, useEffect, useCallback } from 'react';
import type { BookmarkNode } from '../types';

const isExtension = typeof chrome !== 'undefined' && !!chrome.bookmarks;

// Mock data for development
const MOCK_BOOKMARKS: BookmarkNode[] = [
    {
        id: '1',
        title: 'Bookmarks Bar',
        children: [
            {
                id: '10',
                title: 'Work',
                children: [
                    { id: '101', title: 'GitHub', url: 'https://github.com' },
                    { id: '102', title: 'Linear', url: 'https://linear.app' },
                ],
            },
            {
                id: '11',
                title: 'Personal',
                children: [
                    { id: '111', title: 'YouTube', url: 'https://youtube.com' },
                    { id: '112', title: 'Reddit', url: 'https://reddit.com' },
                ],
            },
        ],
    },
];

export const useBookmarks = () => {
    const [bookmarks, setBookmarks] = useState<BookmarkNode[]>([]);
    const [flattenedBookmarks, setFlattenedBookmarks] = useState<BookmarkNode[]>([]);
    const [loading, setLoading] = useState(true);

    const flattenFolders = useCallback((nodes: BookmarkNode[]): BookmarkNode[] => {
        const result: BookmarkNode[] = [];

        const traverse = (node: BookmarkNode) => {
            // If node is a folder (has children)
            if (node.children) {
                // Separate bookmarks and subfolders
                const bookmarkChildren = node.children.filter(child => !child.children);
                const folderChildren = node.children.filter(child => child.children);

                // If this folder has direct bookmark children, add it as a row
                // For the root folders (Bookmarks Bar, etc.), we might want to show them even if empty?
                // But usually we only want to show folders that have content or are explicit user folders.
                // Let's add it if it has bookmarks OR if it's a user created folder (not root/system)
                // For simplicity, we add if it has bookmark children.
                if (bookmarkChildren.length > 0) {
                    result.push({
                        ...node,
                        children: bookmarkChildren
                    });
                }

                // Recursively traverse subfolders
                folderChildren.forEach(traverse);
            }
        };

        nodes.forEach(traverse);
        return result;
    }, []);

    const fetchBookmarks = useCallback(async () => {
        // Only show loading on initial fetch to prevent "refresh" feel on updates
        setBookmarks(prev => {
            if (prev.length === 0) setLoading(true);
            return prev;
        });

        if (isExtension) {
            chrome.bookmarks.getTree((tree) => {
                const rootNodes = tree[0].children || [];
                setBookmarks(rootNodes);
                setFlattenedBookmarks(flattenFolders(rootNodes));
                setLoading(false);
            });
        } else {
            // Simulate async delay
            setTimeout(() => {
                const rootNodes = MOCK_BOOKMARKS[0].children || [];
                setBookmarks(rootNodes);
                setFlattenedBookmarks(flattenFolders(rootNodes));
                setLoading(false);
            }, 500);
        }
    }, [flattenFolders]);

    useEffect(() => {
        fetchBookmarks();

        if (isExtension) {
            const listener = () => fetchBookmarks();
            chrome.bookmarks.onCreated.addListener(listener);
            chrome.bookmarks.onRemoved.addListener(listener);
            chrome.bookmarks.onChanged.addListener(listener);
            chrome.bookmarks.onMoved.addListener(listener);
            chrome.bookmarks.onChildrenReordered.addListener(listener);

            return () => {
                chrome.bookmarks.onCreated.removeListener(listener);
                chrome.bookmarks.onRemoved.removeListener(listener);
                chrome.bookmarks.onChanged.removeListener(listener);
                chrome.bookmarks.onMoved.removeListener(listener);
                chrome.bookmarks.onChildrenReordered.removeListener(listener);
            };
        }
    }, [fetchBookmarks]);

    const moveBookmark = useCallback((id: string, parentId: string, index?: number) => {
        if (isExtension) {
            chrome.bookmarks.move(id, { parentId, index });
        } else {

            // In a real app, we'd update local state here for the mock
        }
    }, []);

    const updateBookmark = useCallback((id: string, title: string, url?: string) => {
        if (isExtension) {
            chrome.bookmarks.update(id, { title, url });
        } else {

        }
    }, []);

    const createBookmark = useCallback((parentId: string, title: string, url?: string) => {
        if (isExtension) {
            chrome.bookmarks.create({ parentId, title, url });
        } else {

        }
    }, []);

    const removeBookmark = useCallback((id: string) => {
        if (isExtension) {
            chrome.bookmarks.remove(id);
        } else {

        }
    }, []);

    return {
        bookmarks,
        flattenedBookmarks,
        loading,
        moveBookmark,
        updateBookmark,
        createBookmark,
        removeBookmark,
        refresh: fetchBookmarks
    };
};

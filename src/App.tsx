import { useState, useMemo, useEffect, useCallback } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
  defaultDropAnimationSideEffects,
  type DropAnimation
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import type { BookmarkNode } from './types';
import { useBookmarks } from './hooks/useBookmarks';
import { Header } from './components/Header';
import { BookmarkRow } from './components/BookmarkRow';
import { BookmarkCard } from './components/BookmarkCard';
import { SettingsPanel } from './components/SettingsPanel';
import { EditBookmarkDialog } from './components/EditBookmarkDialog';


const dropAnimation: DropAnimation = {
  sideEffects: defaultDropAnimationSideEffects({
    styles: {
      active: {
        opacity: '0.5',
      },
    },
  }),
};

import { useUser } from './hooks/useUser';
import { OnboardingDialog } from './components/OnboardingDialog';

/**
 * Main application component.
 * Manages the state of bookmarks (drag & drop, editing), user settings, and the overall layout.
 */
function App() {
  const { flattenedBookmarks, loading, removeBookmark, updateBookmark, moveBookmark } = useBookmarks();
  const { name: userName, updateName, loading: userLoading } = useUser();

  const [activeBookmark, setActiveBookmark] = useState<BookmarkNode | null>(null);
  const [editingBookmark, setEditingBookmark] = useState<BookmarkNode | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Local state for optimistic DnD updates
  const [items, setItems] = useState<BookmarkNode[]>([]);

  // Sync items with flattenedBookmarks when not dragging
  useEffect(() => {
    if (!activeBookmark) {
      setItems(flattenedBookmarks);
    }
  }, [flattenedBookmarks, activeBookmark]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event;

    // Find the bookmark being dragged from items
    let found: BookmarkNode | undefined;
    for (const folder of items) {
      if (folder.children) {
        found = folder.children.find(b => b.id === active.id);
        if (found) break;
      }
    }
    setActiveBookmark(found || null);
  }, [items]);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    // Helper to find container in a specific list of items
    const findContainerInItems = (currentItems: BookmarkNode[], id: string) => {
      return currentItems.find(folder => folder.id === id || folder.children?.some(item => item.id === id));
    };

    setItems((prev) => {
      const activeContainer = findContainerInItems(prev, activeId);
      const overContainer = findContainerInItems(prev, overId);

      if (!activeContainer || !overContainer) return prev;

      const activeItems = activeContainer.children || [];
      const overItems = overContainer.children || [];

      // Find indexes within the FRESH state
      const activeIndex = activeItems.findIndex(i => i.id === activeId);
      const overIndex = overItems.findIndex(i => i.id === overId);

      if (activeIndex === -1) return prev;

      let newIndex: number;
      if (overId === overContainer.id) {
        newIndex = overItems.length;
      } else {
        newIndex = overIndex >= 0 ? overIndex : overItems.length;
      }

      // Same container reordering - SKIP state update to avoid infinite loops.
      // dnd-kit handles visual updates via transforms.
      if (activeContainer.id === overContainer.id) {
        return prev;
      }

      // Cross-container logic
      const itemToMove = activeItems[activeIndex];
      if (!itemToMove) return prev;

      // Remove from source
      let newItems = prev.map(folder => {
        if (folder.id === activeContainer.id) {
          return {
            ...folder,
            children: folder.children?.filter(item => item.id !== activeId)
          };
        }
        return folder;
      });

      // Insert into destination
      newItems = newItems.map(folder => {
        if (folder.id === overContainer.id) {
          const currentChildren = [...(folder.children || [])];
          // Adjust index if needed
          let insertIndex = newIndex;
          if (insertIndex > currentChildren.length) insertIndex = currentChildren.length;

          currentChildren.splice(insertIndex, 0, itemToMove);
          return {
            ...folder,
            children: currentChildren
          };
        }
        return folder;
      });
      return newItems;
    });
  }, [setItems]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    setActiveBookmark(null);

    if (!over) {
      setItems(flattenedBookmarks);
      return;
    }

    const activeId = active.id as string;
    const overId = over.id as string;

    // Find containers in current items state
    const findContainer = (id: string) => {
      return items.find(folder => folder.id === id || folder.children?.some(item => item.id === id));
    };

    const activeContainer = findContainer(activeId);
    const overContainer = findContainer(overId);

    if (activeContainer && overContainer) {
      const overItems = overContainer.children || [];

      const overIndex = overItems.findIndex(b => b.id === overId);

      let newIndex: number;
      if (overId === overContainer.id) {
        newIndex = overItems.length + 1;
      } else {
        const isBelowOverItem =
          over &&
          active.rect.current.translated &&
          active.rect.current.translated.top >
          over.rect.top + over.rect.height;

        const modifier = isBelowOverItem ? 1 : 0;
        newIndex = overIndex >= 0 ? overIndex + modifier : overItems.length + 1;

        // For same container, simple overIndex is usually enough for arrayMove logic,
        // but since we are calculating for the API (splice/insert), we need to be precise.
        if (activeContainer.id === overContainer.id) {
          newIndex = overIndex >= 0 ? overIndex : overItems.length;
        }
      }

      moveBookmark(activeId, overContainer.id, newIndex);
    } else {
      setItems(flattenedBookmarks);
    }
  }, [setActiveBookmark, setItems, flattenedBookmarks, moveBookmark, items]);

  const filteredBookmarks = useMemo(() => {
    // Use 'items' instead of 'flattenedBookmarks' for rendering
    if (!searchQuery) return items;

    // Deep filter
    const lowerQuery = searchQuery.toLowerCase();
    return items.map(folder => ({
      ...folder,
      children: folder.children?.filter(b =>
        b.title.toLowerCase().includes(lowerQuery) ||
        (b.url && b.url.toLowerCase().includes(lowerQuery))
      )
    })).filter(folder => folder.children && folder.children.length > 0);
  }, [items, searchQuery]);

  if (loading || userLoading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-background text-foreground antialiased">
      <Header
        onSearch={setSearchQuery}
        onOpenSettings={() => setIsSettingsOpen(true)}
        userName={userName}
      />

      <main className="container mx-auto py-8 px-4 pb-32">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragOver={handleDragOver}
        >
          <div className="space-y-8">
            {filteredBookmarks.map((folder) => (
              <BookmarkRow
                key={folder.id}
                folder={folder}
                onEdit={(b) => setEditingBookmark(b)}
              />
            ))}
          </div>

          <DragOverlay dropAnimation={dropAnimation}>
            {activeBookmark ? (
              // Ensure we pass a clean bookmark object and force opacity/styles to look "solid"
              <div className="opacity-100">
                <BookmarkCard
                  bookmark={activeBookmark}
                  onEdit={() => { }}
                  isOverlay
                // We might need to force a specific style or prop to ensure it doesn't look "dragging" (ghostly)
                // The BookmarkCard component checks `isDragging` from useSortable.
                // Inside DragOverlay, useSortable returns isDragging=false usually (or we don't call it).
                // Wait, BookmarkCard calls useSortable.
                // We should probably wrap BookmarkCard or pass a prop to disable useSortable or force style.
                // Actually, since we are rendering a fresh component in overlay, it will have its own useSortable hook.
                // But useSortable(id) inside overlay might be tricky.
                // Better to have a "DragPreview" version of the card or pass a prop to disable DnD logic in the card.
                />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </main>

      <SettingsPanel
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        userName={userName}
        onUpdateName={updateName}
      />

      <EditBookmarkDialog
        isOpen={!!editingBookmark}
        bookmark={editingBookmark}
        onClose={() => setEditingBookmark(null)}
        onSave={updateBookmark}
        onDelete={removeBookmark}
      />

      <OnboardingDialog
        isOpen={!userName}
        onSave={updateName}
      />
    </div>
  );
}

export default App;

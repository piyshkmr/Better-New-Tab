export interface BookmarkNode {
    id: string;
    parentId?: string;
    index?: number;
    url?: string;
    title: string;
    dateAdded?: number;
    dateGroupModified?: number;
    children?: BookmarkNode[];
}

export type BookmarkTree = BookmarkNode[];

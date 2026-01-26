import { AnimatePresence, Reorder } from "motion/react";
import type React from "react";
import { useEffect, useRef, useState } from "react";
import type { BrowserTab } from "../webview";
import { TabItem } from "./tab-item";

interface BrowserTabsListProps {
  tabs: BrowserTab[];
  activeTabId: string;
  onReorder: (newOrder: BrowserTab[]) => void;
  onTabClick: (tabId: string) => void;
  onTabClose: (e: any, tabId: string) => void;
  setIsTabDragging: (isDragging: boolean) => void;
}

export const BrowserTabsList = ({
  tabs,
  activeTabId,
  onReorder,
  onTabClick,
  onTabClose,
  setIsTabDragging,
}: BrowserTabsListProps) => {
  const tabsScrollRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const [isResizing, setIsResizing] = useState(false);
  const lastTabCountRef = useRef(tabs.length);

  useEffect(() => {
    let timeoutId: any;
    const handleResize = () => {
      setIsResizing(true);
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => setIsResizing(false), 200);
    };
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      clearTimeout(timeoutId);
    };
  }, []);

  // Auto-scroll to new tab when created
  useEffect(() => {
    if (tabs.length > lastTabCountRef.current && tabsScrollRef.current) {
      // Scroll to the end when a new tab is added
      setTimeout(() => {
        if (tabsScrollRef.current) {
          tabsScrollRef.current.scrollLeft = tabsScrollRef.current.scrollWidth;
        }
      }, 0);
    }
    lastTabCountRef.current = tabs.length;
  }, [tabs.length]);

  return (
    <div className="absolute inset-0 flex items-end overflow-hidden">
      <Reorder.Group
        ref={tabsScrollRef}
        as="div"
        axis="x"
        values={tabs}
        onReorder={onReorder}
        role="tablist"
        aria-label="Open browser tabs"
        className="flex items-end px-2 gap-1 h-full overflow-x-auto overflow-y-hidden [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
        style={{
          maskImage:
            "linear-gradient(to right, transparent 0%, black 20px, black calc(100% - 20px), transparent 100%)",
          WebkitMaskImage:
            "linear-gradient(to right, transparent 0%, black 20px, black calc(100% - 20px), transparent 100%)",
        }}
      >
        <AnimatePresence initial={false}>
          {tabs.map((tab) => (
            <Reorder.Item
              key={tab.id}
              value={tab}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{
                opacity: 0,
                scale: 0.95,
                width: 0,
                marginRight: 0,
                transition: { duration: 0.15 },
              }}
              dragConstraints={tabsScrollRef}
              dragElastic={0.1}
              layout={isResizing ? undefined : true}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              whileDrag={{
                scale: 1.05,
                zIndex: 50,
                boxShadow: "0 10px 20px rgba(0,0,0,0.2)",
              }}
              onDragStart={() => {
                isDraggingRef.current = true;
                setIsTabDragging(true);
              }}
              onDragEnd={() => {
                if (onTabClick && typeof onTabClick === "function") {
                  onTabClick(tab.id);
                }
                setIsTabDragging(false);
                setTimeout(() => {
                  isDraggingRef.current = false;
                }, 50);
              }}
              className="relative flex items-end min-w-[50px] w-[120px] flex-shrink-0 overflow-visible text-app-text-primary/40 hover:text-app-text-primary/80"
              style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
            >
              <TabItem
                tab={tab}
                isActive={activeTabId === tab.id}
                onClick={() => {
                  if (!isDraggingRef.current) {
                    onTabClick(tab.id);
                  }
                }}
                onClose={(e) => onTabClose(e, tab.id)}
              />
            </Reorder.Item>
          ))}
        </AnimatePresence>
      </Reorder.Group>
    </div>
  );
};

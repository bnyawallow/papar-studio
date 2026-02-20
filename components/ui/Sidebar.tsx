"use client";

import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  FolderOpen, 
  Layout, 
  Settings, 
  ChevronLeft,
  ChevronRight,
  Sparkles
} from '../icons/Icons';
import { clsx } from 'clsx';

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  active?: boolean;
}

interface SidebarProps {
  activeItem?: string;
  onNavigate?: (itemId: string) => void;
}

const navItems: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
  { id: 'projects', label: 'Projects', icon: <FolderOpen className="w-5 h-5" /> },
  { id: 'templates', label: 'Templates', icon: <Layout className="w-5 h-5" /> },
  { id: 'settings', label: 'Settings', icon: <Settings className="w-5 h-5" /> },
];

const Sidebar: React.FC<SidebarProps> = ({ activeItem = 'dashboard', onNavigate }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  return (
    <aside 
      className={clsx(
        'fixed left-0 top-0 h-screen bg-background-secondary border-r border-border-default',
        'flex flex-col transition-all duration-300 ease-out z-40',
        isExpanded ? 'w-60' : 'w-16'
      )}
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
    >
      {/* Logo */}
      <div className="h-14 flex items-center px-4 border-b border-border-subtle">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-md bg-accent-primary flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <span className={clsx(
            'font-semibold text-text-primary whitespace-nowrap transition-opacity duration-200',
            isExpanded ? 'opacity-100' : 'opacity-0 w-0 overflow-hidden'
          )}>
            PapAR Studio
          </span>
        </div>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 py-4 px-2 space-y-1">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onNavigate?.(item.id)}
            onMouseEnter={() => setHoveredItem(item.id)}
            onMouseLeave={() => setHoveredItem(null)}
            className={clsx(
              'w-full flex items-center gap-3 px-3 py-2.5 rounded-md transition-all duration-200',
              'group relative',
              activeItem === item.id 
                ? 'bg-background-active text-text-primary' 
                : 'text-text-secondary hover:bg-background-hover hover:text-text-primary'
            )}
          >
            <div className={clsx(
              'flex-shrink-0 transition-colors duration-200',
              activeItem === item.id ? 'text-accent-primary' : 'group-hover:text-accent-primary'
            )}>
              {item.icon}
            </div>
            <span className={clsx(
              'text-sm font-medium whitespace-nowrap transition-all duration-200',
              isExpanded ? 'opacity-100' : 'opacity-0 w-0 overflow-hidden'
            )}>
              {item.label}
            </span>
            
            {/* Tooltip for collapsed state */}
            {!isExpanded && (
              <div className={clsx(
                'absolute left-full ml-2 px-2 py-1 bg-background-tertiary text-text-primary text-sm rounded-md',
                'opacity-0 pointer-events-none transition-opacity duration-200',
                hoveredItem === item.id && 'opacity-100'
              )}>
                {item.label}
              </div>
            )}
            
            {/* Active indicator */}
            {activeItem === item.id && (
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-accent-primary rounded-r-full" />
            )}
          </button>
        ))}
      </nav>

      {/* Collapse indicator */}
      <div className="p-2 border-t border-border-subtle">
        <button 
          onClick={() => setIsExpanded(!isExpanded)}
          className={clsx(
            'w-full flex items-center justify-center p-2 rounded-md',
            'text-text-tertiary hover:text-text-primary hover:bg-background-hover',
            'transition-all duration-200'
          )}
        >
          {isExpanded ? (
            <ChevronLeft className="w-5 h-5" />
          ) : (
            <ChevronRight className="w-5 h-5" />
          )}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;

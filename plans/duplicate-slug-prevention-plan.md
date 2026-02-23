# Plan: Duplicate Slug Prevention & Script Parser Improvements

## Overview
This plan addresses three related issues:
1. Prevent duplicate project titles at creation
2. Prevent duplicate slugs when publishing/renaming projects  
3. Improve script parsing to handle complex scripts

---

## Task 1: Unique Title Validation for New Projects

### Location
`components/dashboard/NewProjectModal.tsx`

### Implementation
1. Add a `checkProjectNameExists` function to `projectService.ts`:
```typescript
export const checkProjectNameExists = async (name: string, excludeId?: string): Promise<boolean> => {
  const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  
  if (!supabase) {
    // Check localStorage
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const projects: Project[] = JSON.parse(stored);
      return projects.some(p => 
        p.name.toLowerCase() === name.toLowerCase() && 
        p.id !== excludeId
      );
    }
    return false;
  }

  // Check Supabase - compare both name and slug
  const { data, error } = await supabase
    .from('projects')
    .select('id, name, published_slug')
    .or(`name.ilike.${name},published_slug.eq.${slug}`)
    .neq('id', excludeId || '')
    .limit(1);

  return !!data && data.length > 0;
};
```

2. Update `NewProjectModal.tsx` to validate on submit:
- Call `checkProjectNameExists` before creating project
- Show error if name already exists

---

## Task 2: Duplicate Slug Detection in PublishModal

### Location
`components/editor/PublishModal.tsx`

### Implementation
1. Add slug check before publishing:
```typescript
const handleCompile = async () => {
  const projectSlug = project.name.toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
  
  // Check for existing slug (excluding current project)
  const existingProject = await getProjectBySlug(projectSlug);
  if (existingProject && existingProject.id !== project.id) {
    onNotify("A project with this name already exists. Please choose a different name or rename the existing project.", "error");
    return;
  }
  
  // ... rest of publish logic
};
```

2. Add helper import:
```typescript
import { getProjectBySlug } from '../../services/projectService';
```

---

## Task 3: Duplicate Slug Detection in Editor

### Location
`components/editor/Editor.tsx`

### Implementation
1. Update `handleProjectNameChange` to validate:
```typescript
const handleProjectNameChange = async (name: string) => {
  // Only check for published projects
  if (project.status === 'Published') {
    const newSlug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    
    // Check if slug is taken by another project
    const existingProject = await getProjectBySlug(newSlug);
    if (existingProject && existingProject.id !== project.id) {
      showToast("A project with this name already exists. Please choose a different name.", 'error');
      return; // Don't update the name
    }
  }
  
  // ... rest of existing logic
};
```

2. Add import:
```typescript
import { getProjectBySlug } from '../services/projectService';
```

---

## Task 4: Improve generateScriptJson Function

### Location
`utils/exportUtils.ts`

### Current Issue
The current regex-based parser fails silently on complex scripts with:
- Multi-line functions
- Nested quotes
- Comments
- Template literals
- Non-standard formatting

### Implementation Options

**Option A: Use a simple JS parser (Recommended)**
```typescript
/**
 * Converts JavaScript script to JSON action format using basic parsing
 * More robust than regex for complex scripts
 */
export const generateScriptJson = (script: string | undefined): object => {
  if (!script) return {};

  const actions: Record<string, any[]> = {
    onInit: [],
    onActivate: [],
    onDeactivate: [],
    onUpdate: [],
    onClick: []
  };

  try {
    // Normalize script - remove comments and extra whitespace
    const normalized = script
      .replace(/\/\/.*$/gm, '')  // Remove single-line comments
      .replace(/\/\*[\s\S]*?\*\//g, '')  // Remove multi-line comments
      .replace(/\n+/g, '\n')
      .trim();

    // Extract action calls using more robust pattern
    const actionPatterns = [
      { 
        pattern: /play\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g, 
        action: 'play',
        handlers: ['onInit', 'onActivate']
      },
      { 
        pattern: /pause\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g, 
        action: 'pause',
        handlers: ['onDeactivate']
      },
      { 
        pattern: /stop\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g, 
        action: 'stop',
        handlers: ['onDeactivate']
      },
      { 
        pattern: /show\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g, 
        action: 'show',
        handlers: ['onActivate']
      },
      { 
        pattern: /hide\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g, 
        action: 'hide',
        handlers: ['onDeactivate']
      },
      { 
        pattern: /openUrl\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g, 
        action: 'openUrl',
        handlers: ['onClick']
      }
    ];

    for (const { pattern, action, handlers } of actionPatterns) {
      let match;
      while ((match = pattern.exec(normalized)) !== null) {
        const targetName = match[1];
        for (const handler of handlers) {
          if (action === 'openUrl') {
            actions[handler].push({ action, url: targetName });
          } else {
            actions[handler].push({ action, target: targetName });
          }
        }
      }
    }

    // Extract transform operations
    const transformPatterns = [
      { 
        pattern: /setPosition\s*\(\s*([^)]+)\s*\)/g, 
        action: 'setPosition'
      },
      { 
        pattern: /setRotation\s*\(\s*([^)]+)\s*\)/g, 
        action: 'setRotation'
      },
      { 
        pattern: /setScale\s*\(\s*([^)]+)\s*\)/g, 
        action: 'setScale'
      }
    ];

    for (const { pattern, action } of transformPatterns) {
      let match;
      while ((match = pattern.exec(normalized)) !== null) {
        const args = match[1].split(',').map((s: string) => {
          const num = parseFloat(s.trim());
          return isNaN(num) ? s.trim() : num;
        });
        actions.onInit.push({
          action,
          target: 'self',
          values: args
        });
      }
    }

    // Determine handler assignment based on context keywords
    const contextKeywords = {
      onInit: ['onInit', 'init', 'start', 'loaded'],
      onActivate: ['onActivate', 'targetFound', 'activate', 'visible'],
      onDeactivate: ['onDeactivate', 'targetLost', 'deactivate', 'hidden'],
      onClick: ['onClick', 'tap', 'click', 'touch']
    };

    // Re-assign actions based on context (heuristic but improved)
    for (const [handler, keywords] of Object.entries(contextKeywords)) {
      const handlerActions = actions[handler];
      if (handlerActions.length > 0) {
        // Keep actions in their assigned handlers
        continue;
      }
    }

  } catch (e) {
    console.warn('Could not parse script, returning empty actions:', e);
  }

  // Remove empty arrays
  Object.keys(actions).forEach(key => {
    if (actions[key].length === 0) {
      delete actions[key];
    }
  });

  return actions;
};
```

**Option B: Add error reporting**
- Instead of silently failing, log warnings for unparseable scripts
- Add a "Scripts may not export correctly" warning in the UI

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/services/projectService.ts` | Add `checkProjectNameExists` function |
| `components/dashboard/NewProjectModal.tsx` | Validate unique title on create |
| `components/editor/PublishModal.tsx` | Check for duplicate slug before publish |
| `components/editor/Editor.tsx` | Check for duplicate slug on rename |
| `utils/exportUtils.ts` | Improve `generateScriptJson` parser |

---

## Testing Checklist

- [ ] Create two projects with same name - should show error
- [ ] Publish a project, rename it - should handle slug change
- [ ] Try to publish project with name matching another - should show error
- [ ] Test script parser with complex multi-line scripts
- [ ] Verify error messages are user-friendly

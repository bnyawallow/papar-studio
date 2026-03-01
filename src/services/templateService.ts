import { Template, Project } from '../../types';
import { blankTemplate } from '../../templates/blank';
import { businessCardTemplate } from '../../templates/business-card';
import { slideshowTemplate } from '../../templates/slideshow';
import { flashCardsTemplate } from '../../templates/flash-cards';
import { performanceTemplate } from '../../templates/performance';
import { animatedModelsTemplate } from '../../templates/animated-models';
import { DEFAULT_IMAGE_TRACKER_PATH, getDefaultTracker } from '../../templates/defaults';

// All available templates
const TEMPLATES: Template[] = [
    blankTemplate,
    businessCardTemplate,
    slideshowTemplate,
    flashCardsTemplate,
    performanceTemplate,
    animatedModelsTemplate,
];

/**
 * Get all available templates
 */
export const getAllTemplates = (): Template[] => TEMPLATES;

/**
 * Get a template by its ID
 */
export const getTemplateById = (id: string): Template | undefined => 
    TEMPLATES.find(t => t.id === id);

/**
 * Get templates filtered by category
 */
export const getTemplatesByCategory = (category: string): Template[] =>
    TEMPLATES.filter(t => t.category === category);

/**
 * Get the default tracker configuration
 * Uses centralized default tracker from templates/defaults.ts
 */
export const createDefaultTracker = getDefaultTracker;

/**
 * Get the default tracker path
 */
export const getDefaultTrackerPath = (): string => DEFAULT_IMAGE_TRACKER_PATH;

/**
 * Clone a template project with a new ID and name
 */
export const cloneTemplateProject = (
    templateId: string, 
    newProjectId: string, 
    newProjectName?: string
): Project | undefined => {
    const template = getTemplateById(templateId);
    if (!template) return undefined;

    const templateProject = template.project;
    
    return {
        ...templateProject,
        id: newProjectId,
        name: newProjectName || `${templateProject.name} Clone`,
        // Ensure default tracker is included if template has no targets
        targets: templateProject.targets.length > 0 ? templateProject.targets : [getDefaultTracker()],
        lastUpdated: new Date().toISOString(),
        status: 'Draft',
        // Preserve template metadata
        templateId: template.id,
        templateName: template.name,
    };
};

/**
 * Ensure a project has at least one tracker (add default if needed)
 */
export const ensureDefaultTracker = (project: Project): Project => {
    if (project.targets.length === 0) {
        return {
            ...project,
            targets: [getDefaultTracker()],
        };
    }
    return project;
};

/**
 * Check if a project was created from a template
 */
export const isTemplateProject = (project: Project): boolean => {
    return !!project.templateId && !!project.templateName;
};

/**
 * Get template info from a project
 */
export const getTemplateInfo = (project: Project): { id: string; name: string } | undefined => {
    if (project.templateId && project.templateName) {
        return {
            id: project.templateId,
            name: project.templateName,
        };
    }
    return undefined;
};

// Re-export for convenience
export { DEFAULT_IMAGE_TRACKER_PATH };

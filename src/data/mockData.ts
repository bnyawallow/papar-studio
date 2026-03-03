// Mock data for development and offline mode
// Uses templates from the templates folder

import { Project, Template } from '../../types';
import { 
  blankTemplate, 
  businessCardTemplate, 
  slideshowTemplate,
  flashCardsTemplate,
  performanceTemplate,
  animatedModelsTemplate
} from '../../templates';

// Helper to create a mock project from a template
const createMockProject = (template: typeof blankTemplate, id: string): Project => {
  const project = { ...template.project };
  project.id = id;
  project.lastUpdated = new Date().toISOString();
  return project as Project;
};

// Default mock projects for development
export const MOCK_PROJECTS: Project[] = [
  createMockProject(blankTemplate, 'mock-1'),
  createMockProject(businessCardTemplate, 'mock-2'),
  createMockProject(slideshowTemplate, 'mock-3'),
  createMockProject(flashCardsTemplate, 'mock-4'),
  createMockProject(performanceTemplate, 'mock-5'),
  createMockProject(animatedModelsTemplate, 'mock-6'),
];

// Export template list for template picker UI
export const TEMPLATES = [
  blankTemplate,
  businessCardTemplate,
  slideshowTemplate,
  flashCardsTemplate,
  performanceTemplate,
  animatedModelsTemplate,
];

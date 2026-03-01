import { Template } from '../types';
import { defaultTracker } from './defaults';

export const animatedModelsTemplate: Template = {
    id: 'tpl_animated_models',
    name: 'Animated Models',
    description: 'Custom animations control (script)',
    imageUrl: 'https://picsum.photos/seed/animated/200/120',
    category: 'entertainment',
    version: '1.0.0',
    project: {
        id: 'template_animated_models',
        name: 'Animated Models',
        targets: [defaultTracker],
        lastUpdated: '',
        status: 'Draft',
        sizeMB: 0.1
    }
};

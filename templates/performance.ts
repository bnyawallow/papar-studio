import { Template } from '../types';
import { defaultTracker } from './defaults';

export const performanceTemplate: Template = {
    id: 'tpl_performance',
    name: 'Performance',
    description: 'Real persons green screen background removal',
    imageUrl: 'https://picsum.photos/seed/performance/200/120',
    category: 'entertainment',
    version: '1.0.0',
    project: {
        id: 'template_performance',
        name: 'Performance',
        targets: [defaultTracker],
        lastUpdated: '',
        status: 'Draft',
        sizeMB: 0.1
    }
};

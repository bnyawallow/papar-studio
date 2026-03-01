import { Template } from '../types';
import { defaultTracker } from './defaults';

export const blankTemplate: Template = {
    id: 'tpl_blank',
    name: 'Blank Project',
    description: 'Start with an empty project with default tracker',
    imageUrl: 'https://picsum.photos/seed/blank/200/120',
    category: 'basic',
    version: '1.0.0',
    project: {
        id: 'template_blank',
        name: 'Blank Project',
        targets: [defaultTracker],
        lastUpdated: '',
        status: 'Draft',
        sizeMB: 0.1
    }
};

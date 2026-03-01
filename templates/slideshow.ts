import { Template } from '../types';
import { defaultTracker } from './defaults';

export const slideshowTemplate: Template = {
    id: 'tpl_slideshow',
    name: 'Slideshow',
    description: 'Multiple videos carousel effect (script)',
    imageUrl: 'https://picsum.photos/seed/slideshow/200/120',
    category: 'entertainment',
    version: '1.0.0',
    project: {
        id: 'template_slideshow',
        name: 'Slideshow',
        targets: [defaultTracker],
        lastUpdated: '',
        status: 'Draft',
        sizeMB: 0.1
    }
};

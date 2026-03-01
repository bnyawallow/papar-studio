import { Template } from '../types';
import { defaultTracker } from './defaults';

export const flashCardsTemplate: Template = {
    id: 'tpl_flash_cards',
    name: 'Flash Cards',
    description: 'Multiple targets background music audio on click (script)',
    imageUrl: 'https://picsum.photos/seed/flashcards/200/120',
    category: 'education',
    version: '1.0.0',
    project: {
        id: 'template_flash_cards',
        name: 'Flash Cards',
        targets: [defaultTracker],
        lastUpdated: '',
        status: 'Draft',
        sizeMB: 0.1
    }
};

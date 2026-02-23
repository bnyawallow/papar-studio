
import { Project, Template, ContentType, Target } from '@/types';

const demoScript = `
// Demo Script for Business Card
// Rotate avatar on update and toggle resume on click

var rotationSpeed = 50; // degrees per second

function onInit({target}) {
  // Hide resume initially
  var resume = target.getObject('resume');
  if(resume) resume.setVisible(false);
  console.log("Business Card Initialized");
}

function onUpdate({target, deltaTime}) {
  // Rotate avatar
  var avatar = target.getObject('avatar');
  if(avatar) {
    var rot = avatar.rotation;
    // Update Y rotation
    avatar.setRotation(rot.x, rot.y + rotationSpeed * deltaTime, rot.z);
  }
}

function onClick({object, target}) {
  console.log("Clicked", object.name);
  
  if(object.name === 'icon-facebook') {
     // Toggle resume visibility
     var resume = target.getObject('resume');
     if(resume) {
         var isVisible = resume.visible;
         resume.setVisible(!isVisible);
     }
  }
}
`;

const businessCardTarget: Target = {
  id: 'target_bc_1',
  name: 'Business Card Target',
  imageUrl: 'https://picsum.photos/seed/businesscard/400/250',
  visible: true,
  script: demoScript,
  contents: [
    {
      id: 'content_avatar',
      name: 'avatar',
      type: ContentType.AVATAR,
      transform: { position: [-33.34, 0.00, 158.16], rotation: [0, 0, 0], scale: [3.53, 3.53, 3.53] },
      visible: true,
      imageUrl: 'https://picsum.photos/seed/avatar/200/200', // Placeholder image
    },
    {
      id: 'content_resume',
      name: 'resume',
      type: ContentType.RESUME,
      transform: { position: [-100.0, 0.00, 0.00], rotation: [-90, 0, 0], scale: [100.0, 100.0, 1.00] },
      visible: true,
      imageUrl: 'https://picsum.photos/seed/resume/300/400', // Placeholder image
    },
    {
      id: 'content_icon_fb',
      name: 'icon-facebook',
      type: ContentType.ICON_FACEBOOK,
      transform: { position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1] },
      visible: true,
      imageUrl: 'https://cdn-icons-png.flaticon.com/512/124/124010.png',
    },
    {
      id: 'content_icon_email',
      name: 'icon-email',
      type: ContentType.ICON_EMAIL,
      transform: { position: [50, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1] },
      visible: true,
      imageUrl: 'https://cdn-icons-png.flaticon.com/512/542/542638.png',
    },
    {
      id: 'content_icon_yt',
      name: 'icon-youtube',
      type: ContentType.ICON_YOUTUBE,
      transform: { position: [100, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1] },
      visible: true,
      imageUrl: 'https://cdn-icons-png.flaticon.com/512/1384/1384060.png',
    },
    {
      id: 'content_icon_web',
      name: 'icon-website',
      type: ContentType.ICON_WEBSITE,
      transform: { position: [130.0, 0.00, 400.0], rotation: [-90, 0, 0], scale: [220.0, 220.0, 1.0] },
      visible: true,
      imageUrl: 'https://cdn-icons-png.flaticon.com/512/1006/1006771.png',
    },
    {
      id: 'content_text',
      name: 'text',
      type: ContentType.TEXT,
      transform: { position: [0.0, 0.0, 0.0], rotation: [0, 0, 0], scale: [608.09, 184.0, 1.0] },
      alwaysFacingUser: true,
      color: '#ffffff',
      outlineColor: '#333333',
      outlineWidth: 5,
      font: 'Courier New',
      style: 'normal',
      weight: 'normal',
      size: 32,
      align: 'left',
      textContent: 'Visual elements (e.g. buttons) and information display\\nTransitional effects and animations with pure scripting.\\nOpen external links when buttons are click.',
      visible: true,
    },
  ],
};

export const MOCK_PROJECTS: Project[] = [
  {
    id: 'proj_1',
    name: 'Clone-Business Card Template',
    targets: [businessCardTarget],
    lastUpdated: '21 hours ago',
    status: 'Draft',
    sizeMB: 2.3,
  },
  {
    id: 'proj_2',
    name: 'redapeke-test1',
    targets: [],
    lastUpdated: '7 minutes ago',
    status: 'Draft',
    sizeMB: 0,
  },
];

const BLANK_PROJECT_TEMPLATE: Project = {
    id: 'template_blank',
    name: 'Blank Project',
    targets: [],
    lastUpdated: '',
    status: 'Draft',
    sizeMB: 0.1
};

const BUSINESS_CARD_PROJECT_TEMPLATE: Project = {
    id: 'template_bc',
    name: 'Business Card',
    targets: [businessCardTarget],
    lastUpdated: '',
    status: 'Draft',
    sizeMB: 2.3
};

export const MOCK_TEMPLATES: Template[] = [
    {
        id: 'tpl_1',
        name: 'Blank Project',
        description: '',
        imageUrl: 'https://picsum.photos/seed/blank/200/120',
        project: BLANK_PROJECT_TEMPLATE,
    },
    {
        id: 'tpl_2',
        name: 'Slideshow',
        description: 'Multiple videos carousel effect (script)',
        imageUrl: 'https://picsum.photos/seed/slideshow/200/120',
        project: BLANK_PROJECT_TEMPLATE, // Should be a specific template
    },
    {
        id: 'tpl_3',
        name: 'Flash Cards',
        description: 'Multiple targets background music audio on click (script)',
        imageUrl: 'https://picsum.photos/seed/flashcards/200/120',
        project: BLANK_PROJECT_TEMPLATE, // Should be a specific template
    },
    {
        id: 'tpl_4',
        name: 'Performance',
        description: 'real persons green screen background removal',
        imageUrl: 'https://picsum.photos/seed/performance/200/120',
        project: BLANK_PROJECT_TEMPLATE, // Should be a specific template
    },
    {
        id: 'tpl_5',
        name: 'Business Card',
        description: 'Information display open external URLs transition effects (script)',
        imageUrl: 'https://picsum.photos/seed/card/200/120',
        project: BUSINESS_CARD_PROJECT_TEMPLATE,
    },
    {
        id: 'tpl_6',
        name: 'Animated Models',
        description: 'custom animations control (script)',
        imageUrl: 'https://picsum.photos/seed/animated/200/120',
        project: BLANK_PROJECT_TEMPLATE, // Should be a specific template
    }
];

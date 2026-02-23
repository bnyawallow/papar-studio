# AR Publishing Architecture Plan

## Executive Summary

This document outlines the plan to update Pictarize Studio's publishing system to support AR apps correctly. The current web publishing exports a browser-based HTML application using MindAR, but AR apps require a structured data format (JSON) plus asset files that can be consumed by native rendering engines.

---

## 1. Current Architecture Analysis

### 1.1 Web Publishing Flow

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│  PublishModal  │───▶│  compileFiles()   │───▶│  .mind file     │
│  (UI Component)│    │  (compiler.ts)   │    │  (Image Target) │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                                      │
                                                      ▼
                       ┌──────────────────┐    ┌─────────────────┐
                       │  uploadFileTo     │◀───│  generateProject│
                       │  Storage()       │    │  Zip()          │
                       └──────────────────┘    └─────────────────┘
                                                      │
                                                      ▼
                                               ┌─────────────────┐
                                               │  Web ZIP        │
                                               │  (index.html +   │
                                               │   assets +       │
                                               │   targets.mind)  │
                                               └─────────────────┘
```

### 1.2 Current Export Structure (ZIP)

```
project.zip
├── index.html         # Standalone web app with embedded JS
├── targets.mind      # MindAR compiled tracking data
└── assets/
    ├── {uuid}.png    # Image assets
    ├── {uuid}.mp4    # Video assets
    ├── {uuid}.glb    # 3D model assets
    └── {uuid}.mp3   # Audio assets
```

### 1.3 Key Components

| File | Purpose |
|------|---------|
| [`components/editor/PublishModal.tsx`](components/editor/PublishModal.tsx) | Publishing UI - triggers compilation and export |
| [`utils/exportUtils.ts`](utils/exportUtils.ts) | Export logic - generates HTML and ZIP |
| [`utils/compiler.ts`](utils/compiler.ts) | MindAR image target compiler |
| [`components/editor/runtime/Player.ts`](components/editor/runtime/Player.ts) | Runtime player for editor preview |

---

## 2. Problem Statement

### 2.1 Issues with Current Architecture for AR Apps

1. **HTML-centric Export**: The ZIP contains a complete HTML web app with embedded JavaScript. AR apps cannot use this - they need raw data.

2. **Missing Structured JSON**: AR apps need a clean JSON format describing:
   - Project metadata
   - All targets with image data
   - Content items with transform data
   - Scripts in a portable format

3. **MindAR Coupling**: The export is tightly coupled to the MindAR browser library. Native AR apps (iOS ARKit, Android ARCore, Unity, etc.) need tracking data in different formats.

4. **Script Execution**: Custom scripts use browser APIs and are embedded in HTML. Native AR apps need scripts in a format they can execute (e.g., JSON-based action definitions).

---

## 3. Proposed AR Publishing Architecture

### 3.1 Dual Export Mode

The system should support two export formats:

1. **Web Export** (current) - ZIP with HTML for browser viewing
2. **AR Export** (new) - ZIP with JSON + assets for AR apps

### 3.2 AR Export Structure

```
project-ar.zip
├── project.json        # Structured project data
├── targets/
│   ├── target_0.mind   # MindAR tracking data (for MindAR-based apps)
│   ├── target_0.jpg    # Original target image
│   └── ...
├── assets/
│   ├── {uuid}.png
│   ├── {uuid}.mp4
│   ├── {uuid}.glb
│   └── {uuid}.mp3
└── scripts/
    └── {targetId}.json  # Script actions in JSON format
```

### 3.3 project.json Schema

```json
{
  "version": "1.0",
  "id": "project-uuid",
  "name": "Project Name",
  "created": "2024-01-01T00:00:00Z",
  "updated": "2024-01-01T00:00:00Z",
  "config": {
    "trackingType": "image",
    "maxTrack": 1,
    "warmupTolerance": 5,
    "missTolerance": 5
  },
  "targets": [
    {
      "id": "target-uuid",
      "name": "Target 1",
      "imageUrl": "targets/target_0.jpg",
      "trackingFile": "targets/target_0.mind",
      "contents": [
        {
          "id": "content-uuid",
          "name": "My Image",
          "type": "image",
          "transform": {
            "position": [0, 0, 0],
            "rotation": [0, 0, 0],
            "scale": [1, 1, 1]
          },
          "url": "assets/{uuid}.png",
          "visible": true
        },
        {
          "id": "content-uuid-2",
          "name": "My Video",
          "type": "video",
          "transform": {
            "position": [0, 0, -0.5],
            "rotation": [0, 0, 0],
            "scale": [1, 1, 1]
          },
          "url": "assets/{uuid}.mp4",
          "autoplay": true,
          "loop": true,
          "muted": false,
          "chromaKey": false
        },
        {
          "id": "content-uuid-3",
          "name": "3D Model",
          "type": "model",
          "transform": {
            "position": [0, 0, -1],
            "rotation": [0, 0, 0],
            "scale": [0.1, 0.1, 0.1]
          },
          "url": "assets/{uuid}.glb",
          "animations": ["walk", "idle"]
        }
      ],
      "script": "scripts/target_0.json"
    }
  ]
}
```

### 3.4 Script Action Format (JSON)

Instead of embedding JavaScript code, convert scripts to JSON action definitions:

```json
{
  "onInit": [
    {
      "action": "log",
      "message": "Experience initialized"
    }
  ],
  "onActivate": [
    {
      "action": "play",
      "target": "My Video"
    },
    {
      "action": "play",
      "target": "Background Music"
    }
  ],
  "onDeactivate": [
    {
      "action": "pause",
      "target": "My Video"
    }
  ],
  "onUpdate": [
    {
      "condition": "time > 5",
      "action": "show",
      "target": "Welcome Text"
    }
  ],
  "onClick": [
    {
      "target": "Buy Button",
      "action": "openUrl",
      "url": "https://example.com"
    }
  ]
}
```

---

## 4. Implementation Plan

### Phase 1: Core JSON Export

- [ ] **4.1** Create `generateARJson()` function in `utils/exportUtils.ts`
  - Extract project metadata
  - Map targets to JSON structure
  - Map contents with transforms
  - Include asset URLs (local paths)

- [ ] **4.2** Create `generateScriptJson()` function
  - Parse existing JavaScript scripts
  - Convert to JSON action format
  - Support basic actions: play, pause, show, hide, openUrl, setPosition, setRotation, setScale

- [ ] **4.3** Update `generateProjectZip()` to support AR mode
  - Add parameter for export type: 'web' | 'ar'
  - When 'ar': include JSON + assets (no HTML)

### Phase 2: Publishing UI Updates

- [ ] **4.4** Update `PublishModal.tsx`
  - Add export type selector (Web / AR App)
  - Add AR-specific options if needed

- [ ] **4.5** Add AR-specific export options
  - Tracking format selection (MindAR, raw image, etc.)
  - Include/exclude scripts

### Phase 3: Validation & Testing

- [ ] **4.6** Test JSON export with sample projects
- [ ] **4.7** Verify asset bundling in ZIP
- [ ] **4.8** Create sample AR app to consume the export

---

## 5. File Changes Summary

| File | Change Type | Description |
|------|-------------|-------------|
| `utils/exportUtils.ts` | Modify | Add `generateARJson()`, `generateScriptJson()`, update ZIP generation |
| `components/editor/PublishModal.tsx` | Modify | Add AR export option in UI |
| `types.ts` | Modify | Add AR export related types if needed |

---

## 6. Backward Compatibility

- Maintain existing web export as default
- AR export is opt-in via UI selector
- Existing projects can be re-exported in AR format

---

## 7. Future Enhancements (Out of Scope)

- Unity/Unreal export templates
- Direct AR app publishing (API)
- Multi-tracking support beyond image targets
- Cloud-based asset streaming

---

## 8. Migration Path

1. **Immediate**: Add JSON export alongside HTML export
2. **Short-term**: Update PublishModal with AR option
3. **Long-term**: Consider separate "AR Export" button in dashboard

---

*Plan created: 2024*
*Last updated: 2024*

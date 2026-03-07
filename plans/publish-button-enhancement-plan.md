# Publish/Republish Button Enhancement Plan

## Overview
Enhance the publishing workflow by replacing the current Compile/Re-compile button with clear Publish and Republish buttons that provide explicit user feedback and step-by-step progress indicators.

## Current State Analysis

### Files to Modify
1. `components/editor/PublishModal.tsx` - Main publishing component

### Current Publishing Flow
1. User clicks "Publish" in Header → Opens PublishModal
2. User clicks "Compile/Re-Compile" button
3. System compiles target images → Uploads mind file → Generates URL/QR
4. Project status set to 'Published'

### Publishing State Detection
- **Never Published**: `project.status !== 'Published'` OR no `mindFileUrl` on targets
- **Already Published**: `project.status === 'Published'` AND `mindFileUrl` exists

## Implementation Plan

### 1. Add Progress Step State
```typescript
// New state to track publishing steps
type PublishStep = 'idle' | 'compiling' | 'generating' | 'uploading' | 'finalizing' | 'complete' | 'error';

interface PublishProgress {
  step: PublishStep;
  progress: number;  // 0-100
  message: string;   // Descriptive text for current step
}
```

### 2. Define Publishing Steps with Descriptive Text
| Step | Message | Description |
|------|---------|-------------|
| compiling | "Compiling tracker file..." | Processing target images into .mind file |
| generating | "Generating HTML..." | Creating the viewer HTML |
| uploading | "Uploading assets to cloud..." | Copying assets to storage |
| finalizing | "Finalizing deployment..." | Setting up URLs and QR codes |
| complete | "Publishing complete!" | Done |

### 3. UI Changes to PublishModal

#### Button Changes
Replace single "Compile/Re-Compile" button with:
- **Publish Project** (for never published):
  - Prominent green button
  - Text: "Publish Project"
  - Subtitle: "Create a new published instance and share"
  
- **Republish** (for already published):
  - Orange/amber warning button
  - Text: "Republish"
  - Warning message: "This will delete the existing published version and create a fresh one from the current project state"

#### Progress Indicator UI
```jsx
// Step-by-step progress display
{isPublishing && (
  <div className="space-y-3">
    {/* Step indicators */}
    {steps.map((s, i) => (
      <div key={s.id} className={`flex items-center gap-3 ${s.completed ? 'text-green-600' : s.current ? 'text-blue-600' : 'text-gray-400'}`}>
        {s.completed ? <CheckIcon /> : s.current ? <SpinnerIcon /> : <CircleIcon />}
        <span>{s.message}</span>
      </div>
    ))}
    
    {/* Overall progress bar */}
    <div className="w-full bg-gray-200 rounded-full h-3">
      <div className="bg-blue-600 h-3 rounded-full transition-all" style={{ width: `${progress}%` }} />
    </div>
    <p className="text-center text-sm text-gray-600">{progress}%</p>
  </div>
)}
```

### 4. Modify handlePublish Function
```typescript
const handlePublish = async () => {
  const isRepublish = project.status === 'Published';
  
  setPublishProgress({ step: 'compiling', progress: 0, message: 'Compiling tracker file...' });
  
  // Step 1: Compile
  try {
    const mindData = await compileFiles(files, (p) => updateProgress('compiling', p * 0.3));
  } catch (e) {
    setPublishProgress({ step: 'error', progress: 0, message: 'Failed to compile: ' + e.message });
    return;
  }
  
  setPublishProgress({ step: 'generating', progress: 30, message: 'Generating HTML...' });
  
  // Step 2: Generate HTML (if needed)
  // ...
  
  setPublishProgress({ step: 'uploading', progress: 60, message: 'Uploading assets to cloud...' });
  
  // Step 3: Upload
  // ...
  
  setPublishProgress({ step: 'finalizing', progress: 90, message: 'Finalizing deployment...' });
  
  // Step 4: Finalize
  // ...
  
  setPublishProgress({ step: 'complete', progress: 100, message: 'Publishing complete!' });
};
```

### 5. Additional UI Enhancements

#### Confirmation for Republish
For republish, show confirmation dialog:
```jsx
{isRepublish && !isPublishing && (
  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
    <p className="text-amber-800 text-sm">
      ⚠️ <strong>Warning:</strong> This will delete the existing published version and create 
      a fresh one. The previous URL will no longer be accessible.
    </p>
  </div>
)}
```

#### Success State
After completion, show success card with:
- Green checkmark
- "Published Successfully!" heading
- Public URL with copy button
- QR code with download button

## Component Structure

### PublishModal.tsx Changes Summary
1. Add `PublishStep` type and `publishProgress` state
2. Add `isPublished` computed property
3. Replace button section with conditional Publish/Republish buttons
4. Add progress step indicators with icons
5. Add republish warning section
6. Enhance success state display
7. Update `handleCompile` → `handlePublish` with step tracking

## Acceptance Criteria

1. ✅ **Publish Button**: Shows "Publish Project" for never-published projects
2. ✅ **Republish Button**: Shows "Republish" for already-published projects  
3. ✅ **Warning Message**: Clear warning displayed for republish action
4. ✅ **Progress Steps**: Each step shows with descriptive text:
   - Compiling the tracker file
   - Generating HTML
   - Copying assets (uploading)
   - Finalizing the deployment
5. ✅ **Visual Progress**: Progress bar and percentage displayed
6. ✅ **Step Indicators**: Visual indication of current, completed, and pending steps
7. ✅ **User Feedback**: Immediate visible feedback upon clicking any button

# Publish/Republish Button Enhancement Implementation Plan

## Current State Analysis
- PublishModal.tsx has basic progress tracking but missing key features
- Button logic still uses handleCompile instead of handlePublish
- No conditional Publish/Republish buttons
- Missing republish warning and confirmation
- No step-by-step progress display with icons

## Complete Implementation Plan

### 1. Fix Button Logic and Add Conditional Buttons
```jsx
// Replace the current button section with:
{isCompiling ? (
  <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
    <div className="bg-blue-600 h-4 rounded-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
    <p className="text-xs text-center mt-1 text-gray-600">{Math.round(progress)}%</p>
  </div>
) : (
  <div className="space-y-3">
    {/* Publish/Republish Button */}
    <button 
      onClick={handlePublish} 
      disabled={isPublishing}
      className={`w-full py-2 rounded-md font-medium transition-all ${
        isAlreadyPublished 
          ? 'bg-amber-600 text-white hover:bg-amber-700'
          : 'bg-green-600 text-white hover:bg-green-600'
      }`}
    >
      {isAlreadyPublished ? "Republish" : "Publish Project"}
    </button>
    
    {/* Republish Warning */}
    {isAlreadyPublished && !isPublishing && (
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <p className="text-amber-800 text-sm">
          ⚠️ <strong>Warning:</strong> This will delete the existing published version and create a fresh one. The previous URL will no longer be accessible.
        </p>
      </div>
    )}
  </div>
)}
```

### 2. Add Step-by-Step Progress Display
```jsx
// Add this section after the button:
{isPublishing && (
  <div className="space-y-3 mt-4">
    {/* Step Indicators */}
    <div className="space-y-2">
      {[
        { step: 'compiling', message: 'Compiling tracker file...', icon: isPublishProgress.step === 'compiling' ? SpinnerIcon : isPublishProgress.step === 'complete' ? CheckIcon : CircleIcon },
        { step: 'generating', message: 'Generating HTML...', icon: isPublishProgress.step === 'generating' ? SpinnerIcon : isPublishProgress.step === 'complete' ? CheckIcon : CircleIcon },
        { step: 'uploading', message: 'Uploading assets to cloud...', icon: isPublishProgress.step === 'uploading' ? SpinnerIcon : isPublishProgress.step === 'complete' ? CheckIcon : CircleIcon },
        { step: 'finalizing', message: 'Finalizing deployment...', icon: isPublishProgress.step === 'finalizing' ? SpinnerIcon : isPublishProgress.step === 'complete' ? CheckIcon : CircleIcon }
      ].map((step, index) => (
        <div key={index} className={`flex items-center gap-3 ${
          step.step === isPublishProgress.step ? 'text-blue-600' : 
          isPublishProgress.step === 'complete' ? 'text-green-600' : 
          'text-gray-400'
        }`}>
          <step.icon className="w-4 h-4" />
          <span className="text-sm">{step.message}</span>
        </div>
      ))}
    </div>
    
    {/* Progress Bar */}
    <div className="w-full bg-gray-200 rounded-full h-3 mt-3">
      <div className="bg-blue-600 h-3 rounded-full transition-all" style={{ width: `${isPublishProgress.progress}%` }} />
    </div>
    <p className="text-center text-xs text-gray-600 mt-1">{isPublishProgress.progress}%</p>
  </div>
)}
```

### 3. Add Republish Confirmation Dialog
```jsx
// Add this state and function:
const [showRepublishConfirm, setShowRepublishConfirm] = useState(false);

// Add this confirmation dialog:
{showRepublishConfirm && (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div className="bg-white rounded-lg p-6 w-96">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Confirm Republish</h3>
      <p className="text-gray-600 mb-6">
        Are you sure you want to republish this project? This will delete the existing published version and create a fresh one. The previous URL will no longer be accessible.
      </p>
      <div className="flex gap-3">
        <button 
          onClick={() => { setShowRepublishConfirm(false); handlePublish(); }}
          className="flex-1 py-2 bg-amber-600 text-white rounded-md hover:bg-amber-700 transition-colors font-medium"
        >
          Republish
        </button>
        <button 
          onClick={() => setShowRepublishConfirm(false)}
          className="flex-1 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-100 transition-colors font-medium"
        >
          Cancel
        </button>
      </div>
    </div>
  </div>
)}
```

### 4. Update Button Click Logic
```jsx
// Update the button onClick to:
onClick={() => {
  if (isAlreadyPublished) {
    setShowRepublishConfirm(true);
  } else {
    handlePublish();
  }
}}
```

### 5. Add Publishing State Management
```jsx
// Add this state:
const [isPublishing, setIsPublishing] = useState(false);

// Update handlePublish to set isPublishing:
setIsPublishing(true);
// ... existing code ...
// At the end of handlePublish:
setIsPublishing(false);
```

### 6. Enhance Success State
```jsx
// Update the success section to show better feedback:
{publishProgress.step === 'complete' && (
  <div className="bg-green-50 border border-green-200 rounded-lg p-4 mt-4">
    <div className="flex items-center gap-3 mb-3">
      <CheckCircleIcon className="w-6 h-6 text-green-600" />
      <div>
        <h4 className="text-lg font-semibold text-green-800">Published Successfully!</h4>
        <p className="text-sm text-green-700">Your project is now live and accessible.</p>
      </div>
    </div>
    {/* Existing share section */}
  </div>
)}
```

## Files to Modify
1. `components/editor/PublishModal.tsx` - Complete rewrite with all enhancements

## Implementation Steps
1. Replace the entire PublishModal.tsx with the enhanced version
2. Test the publishing workflow for both new and existing projects
3. Verify all UI states and transitions work correctly
4. Test error handling and edge cases

## Acceptance Criteria
- ✅ Publish button shows for new projects with green styling
- ✅ Republish button shows for published projects with amber styling
- ✅ Republish warning message displayed
- ✅ Step-by-step progress with icons and descriptions
- ✅ Progress bar and percentage display
- ✅ Republish confirmation dialog
- ✅ Enhanced success state with green checkmark
- ✅ All publishing steps work correctly
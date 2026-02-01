
const COMPILER_URLS = [
  '/vendor/mindar-image-compiler.js',
  'vendor/mindar-image-compiler.js',
  'https://unpkg.com/mind-ar@1.2.2/dist/mindar-image-compiler.prod.js',
  'https://cdn.jsdelivr.net/npm/mind-ar@1.2.2/dist/mindar-image-compiler.prod.js'
];

export const loadCompiler = () => {
  return new Promise<void>((resolve, reject) => {
    // 1. Check if already loaded globally
    if ((window as any).MINDAR && (window as any).MINDAR.Compiler) {
      resolve();
      return;
    }

    // 2. Check if script tag already exists in DOM (e.g. from index.html)
    const existingScript = document.querySelector('script[src*="mindar-image-compiler"]');
    if (existingScript) {
        // Wait for it to finish loading
        let attempts = 0;
        const checkInterval = setInterval(() => {
            if ((window as any).MINDAR && (window as any).MINDAR.Compiler) {
                clearInterval(checkInterval);
                resolve();
            }
            attempts++;
            if (attempts > 30) { // Wait up to 3 seconds for existing script
                clearInterval(checkInterval);
                // If it timed out, assume existing script failed or is broken, try manual load
                console.warn("Existing MindAR script detected but failed to initialize. Attempting manual load...");
                startManualLoad(resolve, reject);
            }
        }, 100);
        return;
    }

    // 3. Start manual load sequence
    startManualLoad(resolve, reject);
  });
};

const startManualLoad = (resolve: () => void, reject: (err: Error) => void) => {
    let currentIndex = 0;

    const tryLoad = () => {
        if (currentIndex >= COMPILER_URLS.length) {
            let errorMsg = "Failed to load MindAR compiler from any source.";
            if (!navigator.onLine) {
                errorMsg += " No internet connection. Please check network.";
            } else {
                errorMsg += " Check console for 404s. Ensure 'public/vendor/mindar-image-compiler.js' exists.";
            }
            console.error(errorMsg);
            reject(new Error(errorMsg));
            return;
        }

        const src = COMPILER_URLS[currentIndex];
        console.log(`[PapAR] Attempting to load compiler: ${src}`);

        const script = document.createElement('script');
        script.src = src;
        script.async = true;
        // Only use crossOrigin for absolute URLs to avoid local file issues
        if (src.startsWith('http')) {
            script.crossOrigin = "anonymous";
        }

        script.onload = () => {
            // Slight delay to allow script execution
            setTimeout(() => {
                if ((window as any).MINDAR && (window as any).MINDAR.Compiler) {
                    console.log("[PapAR] Compiler loaded successfully.");
                    resolve();
                } else {
                    console.warn(`[PapAR] Script loaded from ${src} but MINDAR.Compiler not found.`);
                    script.remove();
                    currentIndex++;
                    tryLoad();
                }
            }, 100);
        };

        script.onerror = () => {
            console.warn(`[PapAR] Failed to load script from ${src}`);
            script.remove();
            currentIndex++;
            tryLoad();
        };

        document.head.appendChild(script);
    };

    tryLoad();
};

function dataURLtoFile(dataurl: string, filename: string) {
    var arr = dataurl.split(','), mime = arr[0].match(/:(.*?);/)![1],
        bstr = atob(arr[1]), n = bstr.length, u8arr = new Uint8Array(n);
    while(n--){
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, {type:mime});
}

export const compileFiles = async (files: File[], onProgress?: (progress: number) => void): Promise<string> => {
    await loadCompiler();
    
    if (!(window as any).MINDAR || !(window as any).MINDAR.Compiler) {
        throw new Error("MindAR Compiler not loaded");
    }
  
    const compiler = new (window as any).MINDAR.Compiler();
    
    if (onProgress) onProgress(0);
  
    return new Promise(async (resolve, reject) => {
        try {
            await compiler.compileImageTargets(files, (progress: number) => {
                if (onProgress) onProgress(progress);
            });
            
            const exportedBuffer = await compiler.exportData();
            const blob = new Blob([exportedBuffer]);
            
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        } catch (error) {
            console.error("Compilation error:", error);
            reject(error);
        }
    });
};

export const compileImage = async (imageUrl: string, onProgress?: (progress: number) => void): Promise<string> => {
  const file = dataURLtoFile(imageUrl, 'target.jpg');
  return compileFiles([file], onProgress);
};

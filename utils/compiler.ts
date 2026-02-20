
const COMPILER_SRC = 'https://cdn.jsdelivr.net/npm/mind-ar@1.2.5/dist/mindar-image.prod.js';

let compilerClass: any = null;

export const loadCompiler = async () => {
  if (compilerClass) return compilerClass;

  // 1. Check if already loaded globally (e.g. via script tag)
  const w = window as any;
  if (w.MINDAR?.IMAGE?.Compiler) {
    compilerClass = w.MINDAR.IMAGE.Compiler;
    return compilerClass;
  }

  // 2. Try dynamic import (handles ESM)
  try {
    // @ts-ignore
    const module = await import(/* webpackIgnore: true */ COMPILER_SRC);
    
    if (module.Compiler) {
        compilerClass = module.Compiler;
    } else if (module.default?.Compiler) {
        compilerClass = module.default.Compiler;
    } else if (w.MINDAR?.IMAGE?.Compiler) {
        // Module might have just set the global
        compilerClass = w.MINDAR.IMAGE.Compiler;
    } else {
        // Fallback: try to find it in the module exports under other names or verify global again
        if (w.MINDAR && w.MINDAR.Compiler) {
             compilerClass = w.MINDAR.Compiler;
        }
    }

    if (!compilerClass) {
        console.error("MindAR module loaded but Compiler not found:", module);
        throw new Error("MindAR Compiler class not found in the loaded module.");
    }
    
    return compilerClass;
  } catch (error) {
      console.error("Failed to load MindAR via import:", error);
      
      // 3. Fallback to Script Tag (handles UMD/IIFE if import fails or if it's not actually ESM)
      // This handles cases where the CDN serves a non-module file that throws on import()
      return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = COMPILER_SRC;
        script.async = true;
        script.crossOrigin = "anonymous";
        script.onload = () => {
            if (w.MINDAR?.IMAGE?.Compiler) {
                compilerClass = w.MINDAR.IMAGE.Compiler;
                resolve(compilerClass);
            } else if (w.MINDAR?.Compiler) {
                compilerClass = w.MINDAR.Compiler;
                resolve(compilerClass);
            } else {
                reject(new Error("MindAR script loaded but global MINDAR object not found."));
            }
        };
        script.onerror = (e) => reject(new Error(`Script load error: ${e}`));
        document.head.appendChild(script);
      });
  }
};

function dataURLtoFile(dataurl: string, filename: string) {
    var arr = dataurl.split(','), mime = arr[0].match(/:(.*?);/)![1],
        bstr = atob(arr[1]), n = bstr.length, u8arr = new Uint8Array(n);
    while(n--){
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, {type:mime});
}

const loadImage = (file: File): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const objectUrl = URL.createObjectURL(file);
        img.onload = () => {
            URL.revokeObjectURL(objectUrl);
            resolve(img);
        };
        img.onerror = (e) => {
            URL.revokeObjectURL(objectUrl);
            reject(e);
        };
        img.src = objectUrl;
    });
};

export const compileFiles = async (files: File[], onProgress?: (progress: number) => void, signal?: AbortSignal): Promise<string> => {
    if (signal?.aborted) throw new Error("Aborted");

    const Compiler = await loadCompiler();
    
    if (!Compiler) {
        throw new Error("MindAR Compiler not loaded");
    }
  
    const compiler = new Compiler();
    
    if (signal?.aborted) throw new Error("Aborted");

    // Load files as images first because MindAR compiler uses drawImage which requires Image, Canvas, or Video elements
    const images = await Promise.all(files.map(loadImage));

    if (signal?.aborted) throw new Error("Aborted");

    if (onProgress) onProgress(0);
  
    return new Promise(async (resolve, reject) => {
        if (signal?.aborted) return reject(new Error("Aborted"));

        try {
            await compiler.compileImageTargets(images, (progress: number) => {
                if (signal?.aborted) return;
                if (onProgress) onProgress(progress);
            });
            
            if (signal?.aborted) return reject(new Error("Aborted"));

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

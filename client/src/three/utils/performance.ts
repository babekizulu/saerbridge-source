import { WebGLRenderer, type WebGLRendererParameters } from 'three';

export type GraphicsQuality = 'LOW' | 'BALANCED' | 'HIGH';
export type RenderBackend = 'webgpu' | 'webgl2' | 'unavailable';

export function selectRenderBackend(input: { hasWebGPU?: boolean; webgpuInitFailed?: boolean; hasWebGL2?: boolean }) {
    if (input.hasWebGPU && !input.webgpuInitFailed) return 'webgpu' as const;
    if (input.hasWebGL2) return 'webgl2' as const;
    return 'unavailable' as const;
}

export function qualitySettings(quality: GraphicsQuality) {
    if (quality === 'LOW') return { dpr: 1 as const, shadows: false, antialias: false };
    if (quality === 'HIGH') return { dpr: [1, 2] as [number, number], shadows: true, antialias: true };
    return { dpr: [1, 1.5] as [number, number], shadows: true, antialias: true };
}

export async function createProjectRenderer(defaultProps: WebGLRendererParameters) {
    const hasWebGPU = typeof navigator !== 'undefined' && 'gpu' in navigator;
    if (selectRenderBackend({ hasWebGPU, hasWebGL2: true }) === 'webgpu') {
        try {
            const webgpu = await import('three/webgpu');
            const renderer = new webgpu.WebGPURenderer({
                canvas: defaultProps.canvas as HTMLCanvasElement,
                antialias: true,
            });
            await renderer.init();
            return renderer;
        } catch {
            return new WebGLRenderer({ ...defaultProps, antialias: true });
        }
    }
    return new WebGLRenderer({ ...defaultProps, antialias: true });
}

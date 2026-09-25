export type ScenePoint = { xMm: number; yMm: number; elevationMm?: number };

export type SceneSpec = {
    schemaVersion: string;
    projectId: string;
    projectRevision: number;
    units: 'mm';
    renderStatus: 'COMPLETE' | 'COMPLETE_WITH_WARNINGS' | 'UNAVAILABLE';
    warnings: { code: string; message: string }[];
    site: {
        plotWidthMm: number;
        plotLengthMm: number;
        plotAreaMm2: number;
        buildingWidthMm: number;
        buildingLengthMm: number;
        buildingAreaMm2: number;
    } | null;
    storeys: { id: string; elevationMm: number; heightMm: number }[];
    floors: { id: string; roomId: string; polygon: { xMm: number; yMm: number }[]; thicknessMm: number; areaMm2: number }[];
    walls: {
        id: string;
        start: { xMm: number; yMm: number };
        end: { xMm: number; yMm: number };
        thicknessMm: number;
        heightMm: number;
        exterior: boolean;
        roomIds: string[];
        segments: { kind: string; offsetMm: number; lengthMm: number; bottomMm: number; heightMm: number }[];
    }[];
    openings: SceneOpening[];
    doors: SceneOpening[];
    windows: SceneOpening[];
    roofs: {
        type: string;
        status: string;
        planes: { id: string; points: { xMm: number; yMm: number; elevationMm: number }[] }[];
    }[];
    fixtures: SceneFurniture[];
    furniture: SceneFurniture[];
    materialBindings: { role: string; materialId: string }[];
    cameraHints: {
        target: { xMm: number; yMm: number; elevationMm: number };
        radiusMm: number;
    } | null;
};

export type SceneOpening = {
    id: string;
    wallId: string;
    kind: string;
    offsetFromWallStartMm: number;
    widthMm: number;
    heightMm: number;
    sillHeightMm: number;
};

export type SceneFurniture = {
    id: string;
    kind: string;
    roomId: string;
    xMm: number;
    yMm: number;
    widthMm: number;
    depthMm: number;
    heightMm: number;
    materialId: string;
};

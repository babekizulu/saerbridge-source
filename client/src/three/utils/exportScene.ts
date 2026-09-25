import { BoxGeometry, Group, Mesh } from 'three';
import type { SceneSpec } from '../sceneTypes';
import { floorTransform } from '../geometry/floorGeometry';
import { roofGeometry } from '../geometry/roofGeometry';
import { openingTransform, segmentTransform } from '../geometry/wallGeometry';
import { bindingMaterial, materialFor } from '../materials/MaterialRegistry';
import { toWorld } from './units';

export function buildExportGroup(scene: SceneSpec) {
    const group = new Group();
    group.name = `${scene.projectId}-rev-${scene.projectRevision}`;
    scene.walls.forEach((wall) => {
        wall.segments.forEach((segment) => {
            const placed = segmentTransform(wall, segment);
            const mesh = new Mesh(new BoxGeometry(...placed.size), bindingMaterial(scene.materialBindings, 'wall'));
            mesh.position.set(...placed.position);
            mesh.rotation.y = placed.rotationY;
            mesh.name = wall.id;
            group.add(mesh);
        });
    });
    scene.floors.forEach((floor) => {
        const placed = floorTransform(floor);
        const mesh = new Mesh(new BoxGeometry(...placed.size), bindingMaterial(scene.materialBindings, 'floor'));
        mesh.position.set(...placed.position);
        mesh.name = floor.id;
        group.add(mesh);
    });
    scene.roofs.forEach((roof) => {
        roof.planes.forEach((plane) => {
            const mesh = new Mesh(roofGeometry(plane), bindingMaterial(scene.materialBindings, 'roof'));
            mesh.name = plane.id;
            group.add(mesh);
        });
    });
    [...scene.doors, ...scene.windows].forEach((opening) => {
        const wall = scene.walls.find((item) => item.id === opening.wallId);
        if (!wall) return;
        const placed = openingTransform(wall, opening);
        const thickness = opening.kind === 'door' ? toWorld(40) : toWorld(20);
        const mesh = new Mesh(
            new BoxGeometry(placed.size[0] * 0.9, placed.size[1] * 0.9, thickness),
            bindingMaterial(scene.materialBindings, opening.kind === 'door' ? 'door' : 'window'),
        );
        mesh.position.set(...placed.position);
        mesh.rotation.y = placed.rotationY;
        mesh.name = opening.id;
        group.add(mesh);
    });
    [...scene.furniture, ...scene.fixtures].forEach((item) => {
        const mesh = new Mesh(
            new BoxGeometry(toWorld(item.widthMm), toWorld(item.heightMm), toWorld(item.depthMm)),
            materialFor(item.materialId),
        );
        mesh.position.set(toWorld(item.xMm + item.widthMm / 2), toWorld(item.heightMm / 2), toWorld(item.yMm + item.depthMm / 2));
        mesh.name = item.id;
        group.add(mesh);
    });
    return group;
}

export async function exportSceneGlb(scene: SceneSpec) {
    const { GLTFExporter } = await import('three/addons/exporters/GLTFExporter.js');
    const exporter = new GLTFExporter();
    const group = buildExportGroup(scene);
    const binary = await new Promise<ArrayBuffer>((resolve, reject) => {
        exporter.parse(group, (result: ArrayBuffer | object) => {
            if (result instanceof ArrayBuffer) resolve(result);
            else reject(new Error('GLB export did not return binary data.'));
        }, (error: unknown) => reject(error), { binary: true });
    });
    group.traverse((child) => {
        const mesh = child as Mesh;
        mesh.geometry?.dispose();
    });
    return binary;
}

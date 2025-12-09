import * as THREE from 'three';
import { VRMHumanBoneName } from '@pixiv/three-vrm';

type GLTFBufferView = { buffer: number; byteOffset: number; byteLength: number; target?: number };
type GLTFAccessor = { bufferView: number; byteOffset?: number; componentType: number; count: number; type: string };

export function exportVRMA(root: THREE.Object3D, clip: THREE.AnimationClip, vrmBoneMap: Map<VRMHumanBoneName, THREE.Object3D>): ArrayBuffer {
  const nodes: any[] = [];
  const nodeIndexMap = new Map<THREE.Object3D, number>();
  const addNode = (obj: THREE.Object3D): number => {
    const idx = nodes.length;
    nodes.push({ name: obj.name, translation: obj.position.toArray(), rotation: obj.quaternion.toArray(), scale: obj.scale.toArray(), children: [] });
    nodeIndexMap.set(obj, idx);
    return idx;
  };
  const buildHierarchy = (obj: THREE.Object3D): number => {
    const idx = addNode(obj);
    for (const child of obj.children) {
      const cidx = buildHierarchy(child);
      nodes[idx].children.push(cidx);
    }
    return idx;
  };
  const sceneRootIndex = buildHierarchy(root);

  const buffers: Uint8Array[] = [];
  const bufferViews: GLTFBufferView[] = [];
  const accessors: GLTFAccessor[] = [];
  const animations: any[] = [];

  const pushArray = (array: Float32Array): number => {
    const byteOffset = buffers.reduce((sum, b) => sum + b.byteLength, 0);
    const bytes = new Uint8Array(array.buffer.slice(0));
    buffers.push(bytes);
    bufferViews.push({ buffer: 0, byteOffset, byteLength: bytes.byteLength });
    return bufferViews.length - 1;
  };

  const anim: any = { name: clip.name || 'Animation', samplers: [], channels: [] };

  for (const track of clip.tracks) {
    const m = track.name.match(/^(.*)\.(position|quaternion)$/);
    if (!m) continue;
    const nodeName = m[1];
    const path = m[2] === 'position' ? 'translation' : 'rotation';
    const obj = nodes.find((n) => n.name === nodeName);
    if (!obj) continue;
    const nodeIndex = nodes.indexOf(obj);

    const times = (track as any).times as number[];
    const values = (track as any).values as number[];
    const timesView = pushArray(new Float32Array(times));
    const valuesView = pushArray(new Float32Array(values));
    const timesAccessorIndex = accessors.push({ bufferView: timesView, componentType: 5126, count: times.length, type: 'SCALAR' }) - 1;
    const comp = path === 'rotation' ? 'VEC4' : 'VEC3';
    const valuesAccessorIndex = accessors.push({ bufferView: valuesView, componentType: 5126, count: values.length / (comp === 'VEC4' ? 4 : 3), type: comp }) - 1;

    const samplerIndex = anim.samplers.push({ input: timesAccessorIndex, output: valuesAccessorIndex, interpolation: 'LINEAR' }) - 1;
    anim.channels.push({ sampler: samplerIndex, target: { node: nodeIndex, path } });
  }

  animations.push(anim);

  const totalByteLength = buffers.reduce((sum, b) => sum + b.byteLength, 0);
  const joined = new Uint8Array(totalByteLength);
  let offset = 0;
  for (const b of buffers) {
    joined.set(b, offset);
    offset += b.byteLength;
  }

  const gltf: any = {
    asset: { version: '2.0' },
    scene: 0,
    scenes: [{ nodes: [sceneRootIndex] }],
    nodes,
    buffers: [{ byteLength: joined.byteLength }],
    bufferViews,
    accessors,
    animations,
    extensionsUsed: ['VRMC_vrm_animation'],
    extensions: {
      VRMC_vrm_animation: {
        specVersion: '1.0',
        humanoid: {
          humanBones: Object.fromEntries(Array.from(vrmBoneMap.entries()).map(([name, obj]) => [name, { node: nodeIndexMap.get(obj)! }]))
        }
      }
    }
  };

  const jsonBytes = new TextEncoder().encode(JSON.stringify(gltf));
  const pad4 = (n: number) => (n + 3) & ~3;
  const jsonPaddedLength = pad4(jsonBytes.byteLength);
  const binPaddedLength = pad4(joined.byteLength);
  const totalLength = 12 + 8 + jsonPaddedLength + 8 + binPaddedLength;

  const glb = new ArrayBuffer(totalLength);
  const header = new DataView(glb, 0, 12);
  header.setUint32(0, 0x46546c67, true);
  header.setUint32(4, 2, true);
  header.setUint32(8, totalLength, true);

  const jsonChunkHeader = new DataView(glb, 12, 8);
  jsonChunkHeader.setUint32(0, jsonPaddedLength, true);
  jsonChunkHeader.setUint32(4, 0x4e4f534a, true);
  const jsonChunk = new Uint8Array(glb, 20, jsonPaddedLength);
  jsonChunk.set(jsonBytes);
  for (let i = jsonBytes.byteLength; i < jsonPaddedLength; i++) jsonChunk[i] = 0x20;

  const binChunkOffset = 20 + jsonPaddedLength;
  const binChunkHeader = new DataView(glb, binChunkOffset, 8);
  binChunkHeader.setUint32(0, binPaddedLength, true);
  binChunkHeader.setUint32(4, 0x004e4942, true);
  const binChunk = new Uint8Array(glb, binChunkOffset + 8, binPaddedLength);
  binChunk.set(joined);
  for (let i = joined.byteLength; i < binPaddedLength; i++) binChunk[i] = 0x00;

  return glb;
}

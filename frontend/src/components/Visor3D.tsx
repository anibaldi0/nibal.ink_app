import { Canvas } from "@react-three/fiber";
import {
  Environment,
  OrbitControls,
  useGLTF,
  useTexture,
} from "@react-three/drei";
import { Suspense, useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import type { DecalInfo, ModeloInfo } from "../types";

const TARGET_HEIGHT = 1;

const MIRROR_U = false;
const FLIP_V = true;

const MARGIN = 0.02;

const GAP_COLOR = "#ffffff";

const MODEL_OFFSET_X = 0.0;
const MODEL_OFFSET_Y = -0.1;
const MODEL_OFFSET_Z = -0.1;

const PEDESTAL_OFFSET_X = 0.0;
const PEDESTAL_OFFSET_Y = -0.52;
const PEDESTAL_OFFSET_Z = 0.0;

const ORBIT_TARGET_X = 0.0;
const ORBIT_TARGET_Y = 0.0;
const ORBIT_TARGET_Z = 0.0;

// ========================================================================
// ESCALA RESPONSIVE
// ------------------------------------------------------------------------
// Ajusta la escala de todo el conjunto (taza + pedestal) segun el ancho
// de la pantalla. La idea es mobile-first: en celular la taza se ve mas
// chica para que entre comoda en pantallas angostas, y en desktop se
// aprovecha el espacio.
//
// Breakpoints (px):
//   < 640          -> 0.5   (mobile)
//   640 a 1023     -> 0.75  (tablet)
//   >= 1024        -> 1.0   (desktop)
// ========================================================================
const SCALE_MOBILE = 0.5;
const SCALE_TABLET = 0.75;
const SCALE_DESKTOP = 1.0;
// ========================================================================

function useResponsiveScale(): number {
  const [scale, setScale] = useState<number>(() => {
    if (typeof window === "undefined") return SCALE_DESKTOP;
    const w = window.innerWidth;
    if (w < 640) return SCALE_MOBILE;
    if (w < 1024) return SCALE_TABLET;
    return SCALE_DESKTOP;
  });

  useEffect(() => {
    function update() {
      const w = window.innerWidth;
      if (w < 640) setScale(SCALE_MOBILE);
      else if (w < 1024) setScale(SCALE_TABLET);
      else setScale(SCALE_DESKTOP);
    }
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return scale;
}

function computeMedianCenterXZ(
  geometry: THREE.BufferGeometry,
): { x: number; z: number } {
  const pos = geometry.attributes.position as THREE.BufferAttribute;
  const xs: number[] = [];
  const zs: number[] = [];
  for (let i = 0; i < pos.count; i++) {
    xs.push(pos.getX(i));
    zs.push(pos.getZ(i));
  }
  xs.sort((a, b) => a - b);
  zs.sort((a, b) => a - b);
  const mid = Math.floor(xs.length / 2);
  return { x: xs[mid], z: zs[mid] };
}

function computeTheta(x: number, z: number, offsetTurns: number): number {
  let theta = Math.atan2(x, z) + offsetTurns * 2 * Math.PI;
  theta =
    ((((theta + Math.PI) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)) -
    Math.PI;
  return theta;
}

function computeCylindricalUVs(
  geometry: THREE.BufferGeometry,
  ratio: number,
  offsetTurns: number,
): void {
  const pos = geometry.attributes.position as THREE.BufferAttribute;
  geometry.computeBoundingBox();
  const bbox = geometry.boundingBox!;

  const minY = bbox.min.y;
  const maxY = bbox.max.y;
  const height = maxY - minY || 1;

  const center = new THREE.Vector3();
  bbox.getCenter(center);

  const uvs = new Float32Array(pos.count * 2);
  const halfImageAngle = ratio * Math.PI;

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i) - center.x;
    const y = pos.getY(i);
    const z = pos.getZ(i) - center.z;

    const theta = computeTheta(x, z, offsetTurns);

    let u: number;
    if (theta >= -halfImageAngle && theta <= halfImageAngle) {
      const t = (theta + halfImageAngle) / (2 * halfImageAngle);
      u = MARGIN + t * (1 - 2 * MARGIN);
    } else {
      u = theta > 0 ? 1 - MARGIN : MARGIN;
    }

    if (MIRROR_U) u = 1 - u;

    let v = (y - minY) / height;
    if (FLIP_V) v = 1 - v;

    uvs[i * 2] = u;
    uvs[i * 2 + 1] = v;
  }

  geometry.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
}

function splitByImageZone(
  geometry: THREE.BufferGeometry,
  ratio: number,
  offsetTurns: number,
  centerX: number,
  centerZ: number,
): { imageGeo: THREE.BufferGeometry; gapGeo: THREE.BufferGeometry } {
  const nonIndexed = geometry.index
    ? geometry.toNonIndexed()
    : geometry.clone();

  const pos = nonIndexed.attributes.position as THREE.BufferAttribute;
  const srcUv = nonIndexed.attributes.uv as THREE.BufferAttribute;
  const srcNormal = nonIndexed.attributes.normal as
    | THREE.BufferAttribute
    | undefined;

  const triCount = Math.floor(pos.count / 3);
  const halfImageAngle = ratio * Math.PI;

  const imageTris: number[] = [];
  const gapTris: number[] = [];

  for (let t = 0; t < triCount; t++) {
    const thetas: number[] = [];
    let allInside = true;

    for (let k = 0; k < 3; k++) {
      const i = t * 3 + k;
      const x = pos.getX(i) - centerX;
      const z = pos.getZ(i) - centerZ;
      const theta = computeTheta(x, z, offsetTurns);
      thetas.push(theta);

      if (theta < -halfImageAngle || theta > halfImageAngle) {
        allInside = false;
      }
    }

    const minT = Math.min(...thetas);
    const maxT = Math.max(...thetas);
    const crossesSeam = maxT - minT > Math.PI;

    if (allInside && !crossesSeam) {
      imageTris.push(t);
    } else {
      gapTris.push(t);
    }
  }

  function buildGeo(tris: number[]): THREE.BufferGeometry {
    const count = tris.length * 3;
    const positions = new Float32Array(count * 3);
    const uvs = new Float32Array(count * 2);
    const normals = new Float32Array(count * 3);

    let vi = 0;
    for (const t of tris) {
      for (let k = 0; k < 3; k++) {
        const s = t * 3 + k;
        positions[vi * 3] = pos.getX(s);
        positions[vi * 3 + 1] = pos.getY(s);
        positions[vi * 3 + 2] = pos.getZ(s);
        uvs[vi * 2] = srcUv.getX(s);
        uvs[vi * 2 + 1] = srcUv.getY(s);
        if (srcNormal) {
          normals[vi * 3] = srcNormal.getX(s);
          normals[vi * 3 + 1] = srcNormal.getY(s);
          normals[vi * 3 + 2] = srcNormal.getZ(s);
        }
        vi++;
      }
    }

    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    g.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
    if (srcNormal) {
      g.setAttribute("normal", new THREE.BufferAttribute(normals, 3));
    }
    g.computeBoundingBox();
    g.computeBoundingSphere();
    return g;
  }

  return {
    imageGeo: buildGeo(imageTris),
    gapGeo: buildGeo(gapTris),
  };
}

interface TazaMeshProps {
  modelo: ModeloInfo;
  decal: DecalInfo;
}

function TazaMesh({ modelo, decal }: TazaMeshProps) {
  const gltf = useGLTF(modelo.glb_url);
  const textura = useTexture(decal.textura_url);

  const prepared = useMemo(() => {
    let foundMesh: THREE.Mesh | null = null;
    gltf.scene.updateMatrixWorld(true);
    gltf.scene.traverse((child) => {
      if (!foundMesh && (child as THREE.Mesh).isMesh) {
        foundMesh = child as THREE.Mesh;
      }
    });
    if (!foundMesh) return null;

    const srcMesh = foundMesh as THREE.Mesh;
    const geo = srcMesh.geometry.clone();

    const median = computeMedianCenterXZ(geo);
    geo.computeBoundingBox();
    const yCenter =
      (geo.boundingBox!.min.y + geo.boundingBox!.max.y) / 2;
    geo.translate(-median.x, -yCenter, -median.z);

    geo.computeBoundingBox();
    const size = new THREE.Vector3();
    geo.boundingBox!.getSize(size);
    const maxDim = Math.max(size.x, size.y, size.z) || 1;
    const scale = TARGET_HEIGHT / maxDim;
    geo.scale(scale, scale, scale);

    geo.computeVertexNormals();

    const ratio = Math.max(0.1, Math.min(1, decal.scale[0] || 1));
    const offsetTurns = decal.offset[0] || 0;

    computeCylindricalUVs(geo, ratio, offsetTurns);

    const { imageGeo, gapGeo } = splitByImageZone(
      geo,
      ratio,
      offsetTurns,
      0,
      0,
    );

    const srcMat = srcMesh.material;
    const matImage = Array.isArray(srcMat)
      ? (srcMat[0].clone() as THREE.MeshStandardMaterial)
      : (srcMat.clone() as THREE.MeshStandardMaterial);

    matImage.transparent = false;
    matImage.opacity = 1.0;
    matImage.depthWrite = true;
    matImage.side = THREE.FrontSide;
    matImage.alphaTest = 0;

    textura.wrapS = THREE.ClampToEdgeWrapping;
    textura.wrapT = THREE.ClampToEdgeWrapping;
    textura.flipY = false;
    textura.repeat.set(1, 1);
    textura.offset.set(0, 0);
    textura.needsUpdate = true;

    matImage.map = textura;
    matImage.needsUpdate = true;

    const matGap = new THREE.MeshStandardMaterial({
      color: new THREE.Color(GAP_COLOR),
      roughness: matImage.roughness ?? 0.7,
      metalness: matImage.metalness ?? 0.0,
    });

    return { imageGeo, gapGeo, matImage, matGap };
  }, [gltf.scene, decal.scale, decal.offset, textura]);

  if (!prepared) return null;

  return (
    <group position={[MODEL_OFFSET_X, MODEL_OFFSET_Y, MODEL_OFFSET_Z]}>
      <mesh geometry={prepared.imageGeo} material={prepared.matImage} />
      <mesh geometry={prepared.gapGeo} material={prepared.matGap} />
    </group>
  );
}

interface Visor3DProps {
  modelo: ModeloInfo;
  decal: DecalInfo;
}

export default function Visor3D({ modelo, decal }: Visor3DProps) {
  const responsiveScale = useResponsiveScale();

  return (
    <Canvas
      camera={{ position: [0, 0.2, 2], fov: 45 }}
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true }}
      style={{ background: "transparent" }}
    >
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 5, 5]} intensity={1.2} />
      <directionalLight position={[-5, 3, -5]} intensity={0.4} />

      <Suspense fallback={null}>
        {/* El grupo entero (taza + pedestal) escala segun pantalla. */}
        <group scale={responsiveScale}>
          <TazaMesh modelo={modelo} decal={decal} />

          <mesh
            position={[
              PEDESTAL_OFFSET_X,
              PEDESTAL_OFFSET_Y,
              PEDESTAL_OFFSET_Z,
            ]}
          >
            <cylinderGeometry args={[0.6, 0.65, 0.04, 64]} />
            <meshStandardMaterial
              color="#1a1a1a"
              roughness={0.7}
              metalness={0.3}
            />
          </mesh>
        </group>

        <Environment preset="warehouse" />
      </Suspense>

      <OrbitControls
        enablePan={false}
        enableZoom
        minDistance={1}
        maxDistance={5}
        autoRotate
        autoRotateSpeed={1.5}
        target={[ORBIT_TARGET_X, ORBIT_TARGET_Y, ORBIT_TARGET_Z]}
      />
    </Canvas>
  );
}

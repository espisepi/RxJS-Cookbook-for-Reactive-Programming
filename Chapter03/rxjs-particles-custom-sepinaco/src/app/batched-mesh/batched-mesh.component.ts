import { Component, ElementRef, ViewChild, OnInit, OnDestroy, NgZone } from '@angular/core';
import * as THREE from 'three';
import Stats from 'three/examples/jsm/libs/stats.module.js';
import { MapControls } from 'three/examples/jsm/controls/MapControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { GUI } from 'lil-gui';
import { acceleratedRaycast, computeBatchedBoundsTree } from 'three-mesh-bvh';
import {
  createRadixSort,
  extendBatchedMeshPrototype,
  getBatchedMeshLODCount
} from '@three.ez/batched-mesh-extensions';
import {
  performanceRangeLOD,
  simplifyGeometriesByErrorLOD
} from '@three.ez/simplify-geometry';

// Add and override BatchedMesh methods
extendBatchedMeshPrototype();

// Add the extension functions
THREE.Mesh.prototype.raycast = acceleratedRaycast;
(THREE.BatchedMesh.prototype as any).computeBoundsTree = computeBatchedBoundsTree;

@Component({
  selector: 'app-batched-mesh',
  imports: [],
  templateUrl: './batched-mesh.component.html',
  styleUrl: './batched-mesh.component.scss'
})
export class BatchedMeshComponent implements OnInit, OnDestroy {
  @ViewChild('container', { static: true }) container!: ElementRef<HTMLDivElement>;

  private stats?: Stats;
  private camera?: THREE.PerspectiveCamera;
  private scene?: THREE.Scene;
  private renderer?: THREE.WebGLRenderer;
  private batchedMesh?: THREE.BatchedMesh;
  private controls?: MapControls;
  private gui?: GUI;
  private animationId?: number;

  private readonly instancesCount = 500000;
  private lastHoveredInstance: number | null = null;
  private readonly lastHoveredColor = new THREE.Color();
  private readonly highlight = new THREE.Color('red');

  private readonly raycaster = new THREE.Raycaster();
  private readonly mouse = new THREE.Vector2(1, 1);
  private readonly position = new THREE.Vector3();
  private readonly quaternion = new THREE.Quaternion();
  private readonly scale = new THREE.Vector3(1, 1, 1);
  private readonly matrix = new THREE.Matrix4();
  private readonly color = new THREE.Color();

  private config = {
    freeze: false,
    useBVH: true,
    useLOD: true
  };

  private boundOnPointerMove?: (event: PointerEvent) => void;
  private boundOnWindowResize?: () => void;

  constructor(private ngZone: NgZone) { }

  async ngOnInit() {
    await this.init();
  }

  ngOnDestroy() {
    this.cleanup();
  }

  private async init() {
    // Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.8;
    this.container.nativeElement.appendChild(this.renderer.domElement);

    // Scene
    this.scene = new THREE.Scene();

    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmremGenerator.fromScene(
      new RoomEnvironment(),
      0.04
    ).texture;

    // Camera
    this.camera = new THREE.PerspectiveCamera(
      50,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 20, 55);

    // Raycaster
    this.raycaster.firstHitOnly = true;

    // Stats
    this.stats = new Stats();
    this.container.nativeElement.appendChild(this.stats.dom);

    // Controls
    this.controls = new MapControls(this.camera, this.renderer.domElement);
    this.controls.maxPolarAngle = Math.PI / 2;

    // Geometries
    const geometries = [
      new THREE.TorusKnotGeometry(1, 0.4, 256, 32, 1, 1),
      new THREE.TorusKnotGeometry(1, 0.4, 256, 32, 1, 2),
      new THREE.TorusKnotGeometry(1, 0.4, 256, 32, 1, 3),
      new THREE.TorusKnotGeometry(1, 0.4, 256, 32, 1, 4),
      new THREE.TorusKnotGeometry(1, 0.4, 256, 32, 1, 5),
      new THREE.TorusKnotGeometry(1, 0.4, 256, 32, 2, 1),
      new THREE.TorusKnotGeometry(1, 0.4, 256, 32, 2, 3),
      new THREE.TorusKnotGeometry(1, 0.4, 256, 32, 3, 1),
      new THREE.TorusKnotGeometry(1, 0.4, 256, 32, 4, 1),
      new THREE.TorusKnotGeometry(1, 0.4, 256, 32, 5, 3)
    ];

    // Generate 4 LODs for each geometry
    const geometriesLODArray = await simplifyGeometriesByErrorLOD(
      geometries,
      4,
      performanceRangeLOD
    );

    // Create BatchedMesh
    const { vertexCount, indexCount, LODIndexCount } = getBatchedMeshLODCount(
      geometriesLODArray
    );
    this.batchedMesh = new THREE.BatchedMesh(
      this.instancesCount,
      vertexCount,
      indexCount,
      new THREE.MeshStandardMaterial({ metalness: 1, roughness: 0.8 })
    );

    // Enable radix sort for better performance
    (this.batchedMesh as any).customSort = createRadixSort(this.batchedMesh);

    // Add geometries and their LODs to the batched mesh
    for (let i = 0; i < geometriesLODArray.length; i++) {
      const geometryLOD = geometriesLODArray[i];
      const geometryId = (this.batchedMesh as any).addGeometry(
        geometryLOD[0],
        -1,
        LODIndexCount[i]
      );
      (this.batchedMesh as any).addGeometryLOD(geometryId, geometryLOD[1], 50);
      (this.batchedMesh as any).addGeometryLOD(geometryId, geometryLOD[2], 100);
      (this.batchedMesh as any).addGeometryLOD(geometryId, geometryLOD[3], 125);
      (this.batchedMesh as any).addGeometryLOD(geometryId, geometryLOD[4], 200);
    }

    // Place instances in a 2D grid with randomized rotation and color
    const sqrtCount = Math.ceil(Math.sqrt(this.instancesCount));
    const size = 5.5;
    const start = (sqrtCount / -2 * size) + (size / 2);

    for (let i = 0; i < this.instancesCount; i++) {
      const r = Math.floor(i / sqrtCount);
      const c = i % sqrtCount;
      const id = (this.batchedMesh as any).addInstance(
        Math.floor(Math.random() * geometriesLODArray.length)
      );
      this.position.set(c * size + start, 0, r * size + start);
      this.quaternion.random();
      this.batchedMesh.setMatrixAt(
        id,
        this.matrix.compose(this.position, this.quaternion, this.scale)
      );
      this.batchedMesh.setColorAt(
        id,
        this.color.setHSL(Math.random(), 0.6, 0.5)
      );
    }

    // Compute BLAS (bottom-level acceleration structure) BVH
    (this.batchedMesh as any).computeBoundsTree();

    // Compute TLAS (top-level acceleration structure) BVH
    (this.batchedMesh as any).computeBVH(THREE.WebGLCoordinateSystem);

    this.scene.add(this.batchedMesh);

    // Setup GUI
    this.setupGUI();

    // Event listeners
    this.boundOnPointerMove = this.onPointerMove.bind(this);
    this.boundOnWindowResize = this.onWindowResize.bind(this);
    document.addEventListener('pointermove', this.boundOnPointerMove);
    window.addEventListener('resize', this.boundOnWindowResize);
    this.onWindowResize();

    // Start animation loop
    this.ngZone.runOutsideAngular(() => {
      this.animate();
    });
  }

  private setupGUI() {
    if (!this.batchedMesh) return;

    const bvh = (this.batchedMesh as any).bvh;
    const geometryInfo = (this.batchedMesh as any)._geometryInfo;
    const lods = geometryInfo.map((x: any) => x.LOD);
    const onBeforeRender = (this.batchedMesh as any).onBeforeRender;

    this.gui = new GUI();

    this.gui.add(this.batchedMesh as any, 'instanceCount').disable();

    this.gui.add(this.config, 'freeze').onChange((v: boolean) => {
      if (this.batchedMesh) {
        (this.batchedMesh as any).onBeforeRender = v ? () => { } : onBeforeRender;
      }
    });

    const frustumCullingFolder = this.gui.addFolder('Frustum culling & raycasting');
    frustumCullingFolder.add(this.config, 'useBVH').onChange((v: boolean) => {
      if (this.batchedMesh) {
        (this.batchedMesh as any).bvh = v ? bvh : null;
      }
    });

    const geometriesFolder = this.gui.addFolder('Geometries');
    geometriesFolder.add(this.config, 'useLOD').onChange((v: boolean) => {
      if (this.batchedMesh) {
        const geometryInfo = (this.batchedMesh as any)._geometryInfo;
        for (let i = 0; i < geometryInfo.length; i++) {
          geometryInfo[i].LOD = v ? lods[i] : null;
        }
      }
    });
  }

  private onPointerMove(event: PointerEvent) {
    event.preventDefault();
    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    this.raycast();
  }

  private onWindowResize() {
    if (!this.camera || !this.renderer) return;
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private raycast() {
    if (!this.camera || !this.batchedMesh) return;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersection = this.raycaster.intersectObject(this.batchedMesh);

    const batchId = intersection.length > 0 ? (intersection[0] as any).batchId : null;

    if (this.lastHoveredInstance === batchId) return;

    if (this.lastHoveredInstance !== null) {
      this.batchedMesh.setColorAt(this.lastHoveredInstance, this.lastHoveredColor);
    }

    if (batchId !== null && batchId !== undefined) {
      this.batchedMesh.getColorAt(batchId, this.lastHoveredColor);
      this.batchedMesh.setColorAt(batchId, this.highlight);
    }

    this.lastHoveredInstance = batchId;
  }

  private animate = () => {
    if (!this.renderer || !this.scene || !this.camera) return;

    this.stats?.begin();

    this.controls?.update();
    this.renderer.render(this.scene, this.camera);

    this.stats?.end();

    this.animationId = requestAnimationFrame(this.animate);
  };

  private cleanup() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }

    if (this.boundOnPointerMove) {
      document.removeEventListener('pointermove', this.boundOnPointerMove);
    }
    if (this.boundOnWindowResize) {
      window.removeEventListener('resize', this.boundOnWindowResize);
    }

    if (this.gui) {
      this.gui.destroy();
    }

    if (this.batchedMesh) {
      this.batchedMesh.geometry.dispose();
      if (Array.isArray(this.batchedMesh.material)) {
        this.batchedMesh.material.forEach(m => m.dispose());
      } else {
        this.batchedMesh.material.dispose();
      }
    }

    if (this.scene) {
      this.scene.clear();
    }

    if (this.renderer) {
      this.renderer.dispose();
      if (this.renderer.domElement.parentNode) {
        this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
      }
    }

    if (this.stats && this.stats.dom.parentNode) {
      this.stats.dom.parentNode.removeChild(this.stats.dom);
    }
  }
}

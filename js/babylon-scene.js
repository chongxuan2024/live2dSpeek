class BabylonSceneManager {
    constructor() {
        this.canvas = document.getElementById('renderCanvas');
        this.engine = new BABYLON.Engine(this.canvas, true);
        this.currentHouseIndex = 0;
        this.houses = [
            'models/house/basic_house_map.glb',
            'models/house/apartment_plan.glb'
        ];
        // 保存初始状态
        this.initialState = {
            scale: null,
            position: null,
            rotation: null,
            cameraPosition: null
        };
    }

    async createScene() {
        this.scene = new BABYLON.Scene(this.engine);
        
        // 添加相机
        this.camera = new BABYLON.ArcRotateCamera(
            "camera",
            0, Math.PI / 3,
            10,
            BABYLON.Vector3.Zero(),
            this.scene
        );
        this.camera.attachControl(this.canvas, true);
        
        // 添加光源
        new BABYLON.HemisphericLight(
            "light",
            new BABYLON.Vector3(0, 1, 0),
            this.scene
        );

        await this.loadHouse(this.houses[0]);

        // 暴露控制方法到全局
        window.rotateHouse = this.rotateHouse.bind(this);
        window.scaleHouse = this.scaleHouse.bind(this);
        window.resetHouse = this.resetHouse.bind(this);
        
        return this.scene;
    }

    // 旋转房屋
    rotateHouse(angleInDegrees = 90) {
        if (!this.currentHouse) {
            console.error('No house model loaded');
            return;
        }
        const angleInRadians = (angleInDegrees * Math.PI) / 180;
        BABYLON.Animation.CreateAndStartAnimation(
            "rotateHouse",
            this.currentHouse,
            "rotation.y",
            30,
            30,
            this.currentHouse.rotation.y,
            this.currentHouse.rotation.y + angleInRadians,
            BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
        );
    }

    // 缩放房屋
    scaleHouse(scale = 1.0) {
        if (!this.currentHouse) {
            console.error('No house model loaded');
            return;
        }
        const currentScale = this.currentHouse.scaling.x;
        const targetScale = Math.max(0.1, Math.min(5, scale));
        BABYLON.Animation.CreateAndStartAnimation(
            "scaleHouse",
            this.currentHouse,
            "scaling",
            30,
            30,
            this.currentHouse.scaling,
            new BABYLON.Vector3(targetScale, targetScale, targetScale),
            BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
        );
    }

    // 重置房屋位置和缩放
    resetHouse() {
        if (!this.currentHouse || !this.initialState.scale) {
            console.error('No house model loaded or initial state not saved');
            return;
        }

        console.log('Resetting house to initial state');

        // 重置位置
        BABYLON.Animation.CreateAndStartAnimation(
            "resetPosition",
            this.currentHouse,
            "position",
            30,
            30,
            this.currentHouse.position,
            this.initialState.position,
            BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
        );

        // 重置旋转
        BABYLON.Animation.CreateAndStartAnimation(
            "resetRotation",
            this.currentHouse,
            "rotation",
            30,
            30,
            this.currentHouse.rotation,
            this.initialState.rotation,
            BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
        );

        // 重置缩放
        BABYLON.Animation.CreateAndStartAnimation(
            "resetScale",
            this.currentHouse,
            "scaling",
            30,
            30,
            this.currentHouse.scaling,
            this.initialState.scale,
            BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
        );

        // 重置相机位置
        this.camera.setPosition(this.initialState.cameraPosition);
        this.camera.setTarget(BABYLON.Vector3.Zero());
    }

    async loadHouse(modelPath) {
        try {
            if (this.currentHouse) {
                this.currentHouse.dispose();
            }

            console.log('Loading house model:', modelPath);
            const result = await BABYLON.SceneLoader.ImportMeshAsync(
                "",
                modelPath,
                "",
                this.scene
            );
            
            this.currentHouse = result.meshes[0];
            console.log('House model loaded:', this.currentHouse);
            
            // 计算模型包围盒
            const boundingBox = this.currentHouse.getHierarchyBoundingVectors();
            const size = {
                width: boundingBox.max.x - boundingBox.min.x,
                height: boundingBox.max.y - boundingBox.min.y,
                depth: boundingBox.max.z - boundingBox.min.z
            };

            // 计算理想的缩放比例（基于场景大小）
            const targetSize = 10; // 期望的模型最大尺寸
            const maxDimension = Math.max(size.width, size.height, size.depth);
            const scale = targetSize / maxDimension;

            // 应用缩放
            this.currentHouse.scaling = new BABYLON.Vector3(scale, scale, scale);

            // 确保模型位于场景中心
            this.currentHouse.position = BABYLON.Vector3.Zero();
            
            // 设置相机位置
            const cameraPosition = new BABYLON.Vector3(0, targetSize, targetSize);
            this.camera.setPosition(cameraPosition);
            this.camera.setTarget(BABYLON.Vector3.Zero());

            // 初始化旋转
            this.currentHouse.rotation = new BABYLON.Vector3(0, 0, 0);

            // 保存初始状态
            this.initialState = {
                scale: new BABYLON.Vector3(scale, scale, scale),
                position: BABYLON.Vector3.Zero(),
                rotation: new BABYLON.Vector3(0, 0, 0),
                cameraPosition: cameraPosition.clone()
            };

            // 添加点击事件处理房间切换
            this.scene.onPointerDown = (evt, pickResult) => {
                if (pickResult.hit) {
                    const mesh = pickResult.pickedMesh;
                    if (mesh.name.includes("Room")) {
                        this.focusOnRoom(mesh);
                    }
                }
            };
        } catch (error) {
            console.error('Failed to load house model:', error);
        }
    }

    focusOnRoom(roomMesh) {
        const targetPosition = roomMesh.position;
        
        BABYLON.Animation.CreateAndStartAnimation(
            "cameraMove",
            this.camera,
            "position",
            30,
            60,
            this.camera.position,
            targetPosition,
            BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
        );
    }

    async switchHouse() {
        this.currentHouseIndex = (this.currentHouseIndex + 1) % this.houses.length;
        await this.loadHouse(this.houses[this.currentHouseIndex]);
    }

    run() {
        this.engine.runRenderLoop(() => {
            this.scene.render();
        });

        window.addEventListener('resize', () => {
            this.engine.resize();
        });
    }
} 
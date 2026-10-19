(function () {
  let scene, camera, renderer, controls;
  let avatarModel = null;
  let proceduralAvatarGroup = null;
  let mixer = null;
  let clock = new THREE.Clock();

  function initEngine() {
    const container = document.getElementById('canvas-container');
    if (!container) return;

    // SCENE
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x05050A);

    // CAMERA
    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(0, 1.2, 3.2);

    // RENDERER
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    // ORBIT CONTROLS
    if (window.THREE && window.THREE.OrbitControls) {
      controls = new window.THREE.OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.05;
      controls.target.set(0, 0.9, 0);
      controls.maxPolarAngle = Math.PI / 2 + 0.1;
      controls.minDistance = 1.5;
      controls.maxDistance = 6.0;
    }

    // LIGHTING
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
    scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0xffffff, 1.8);
    mainLight.position.set(2, 4, 3);
    mainLight.castShadow = true;
    scene.add(mainLight);

    const cyanRimLight = new THREE.DirectionalLight(0x00F2FE, 1.5);
    cyanRimLight.position.set(-3, 2, -2);
    scene.add(cyanRimLight);

    const purpleRimLight = new THREE.DirectionalLight(0xA855F7, 1.5);
    purpleRimLight.position.set(3, 2, -2);
    scene.add(purpleRimLight);

    // GRID & STAGE PODIUM
    const grid = new THREE.GridHelper(10, 20, 0xA855F7, 0x181828);
    grid.position.y = 0;
    scene.add(grid);

    const stageGeo = new THREE.CylinderGeometry(1.5, 1.7, 0.1, 32);
    const stageMat = new THREE.MeshStandardMaterial({ color: 0x12121F, metalness: 0.8, roughness: 0.2 });
    const stagePodium = new THREE.Mesh(stageGeo, stageMat);
    stagePodium.position.y = -0.05;
    stagePodium.receiveShadow = true;
    scene.add(stagePodium);

    window.addEventListener('resize', onWindowResize);

    // Parse target 3D model URL from query parameter "?model=..."
    const urlParams = new URLSearchParams(window.location.search);
    const modelParam = urlParams.get('model');

    if (modelParam) {
      load3DModelDirect(decodeURIComponent(modelParam));
    } else {
      load3DModelDirect('/avatar/models/3d_character_model.glb');
    }

    animate();
    sendRNEvent({ type: 'ENGINE_READY' });
  }

  function onWindowResize() {
    if (!camera || !renderer) return;
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }

  function sendRNEvent(payload) {
    if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
      window.ReactNativeWebView.postMessage(JSON.stringify(payload));
    }
  }

  function stopAndDisposeMixer() {
    if (mixer) {
      mixer.stopAllAction();
      mixer = null;
    }
  }

  function hideProgress() {
    const el = document.getElementById('loading-container');
    if (el) el.style.display = 'none';
  }

  function showErrorOnScreen(msg) {
    const errBox = document.getElementById('error-container');
    const errDet = document.getElementById('error-details');
    if (errBox && errDet) {
      errDet.innerText = msg;
      errBox.style.display = 'block';
    }
  }

  function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();
    if (mixer) mixer.update(delta);
    if (controls) controls.update();
    if (renderer && scene && camera) renderer.render(scene, camera);
  }

  // DIRECT 3D MODEL LOADER (GLB / FBX)
  function load3DModelDirect(rawUrl) {
    if (!rawUrl) return;
    const url = encodeURI(decodeURI(rawUrl));
    const isFBX = url.toLowerCase().includes('.fbx');

    stopAndDisposeMixer();
    hideProgress();

    // 1. LOAD FBX 3D MODEL
    if (isFBX) {
      const LoaderClass = window.THREE?.FBXLoader || THREE.FBXLoader;
      if (!LoaderClass) {
        setTimeout(() => load3DModelDirect(rawUrl), 150);
        return;
      }

      try {
        const loader = new LoaderClass();
        loader.load(url, function (fbx) {
          let hasMesh = false;
          try {
            fbx.traverse((child) => {
              if (child.isMesh || child.isSkinnedMesh || (child.geometry && child.geometry.attributes && child.geometry.attributes.position)) {
                hasMesh = true;
              }
            });
          } catch (e) {}

          const clips = fbx.animations || [];

          if (hasMesh) {
            if (proceduralAvatarGroup) { scene.remove(proceduralAvatarGroup); proceduralAvatarGroup = null; }
            if (avatarModel) { scene.remove(avatarModel); avatarModel = null; }

            avatarModel = fbx;

            avatarModel.traverse((child) => {
              if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
                if (child.material) {
                  const mats = Array.isArray(child.material) ? child.material : [child.material];
                  mats.forEach((m) => {
                    m.transparent = false;
                    m.opacity = 1.0;
                    m.side = THREE.DoubleSide;
                    m.depthWrite = true;
                  });
                }
              }
            });

            try {
              const box = new THREE.Box3().setFromObject(avatarModel);
              const size = box.getSize(new THREE.Vector3());
              const center = box.getCenter(new THREE.Vector3());

              const maxDim = Math.max(size.x, size.y, size.z);
              if (maxDim > 0 && isFinite(maxDim)) {
                const scale = 1.6 / maxDim;
                avatarModel.scale.set(scale, scale, scale);
              }

              box.setFromObject(avatarModel);
              box.getCenter(center);
              avatarModel.position.sub(center);
              avatarModel.position.y += 0.8;
            } catch (e) {}

            scene.add(avatarModel);
          }

          if (clips && clips.length > 0) {
            mixer = new THREE.AnimationMixer(avatarModel || fbx);
            clips.forEach((clip) => {
              const action = mixer.clipAction(clip);
              action.play();
            });
          }

          hideProgress();
          sendRNEvent({ type: 'MODEL_LOADED' });
        }, undefined, function (err) {
          console.warn('[STAGE] FBX Load error:', err);
        });
        return;
      } catch (e) {
        console.warn('[STAGE] FBX Loader exception:', e);
        return;
      }
    }

    // 2. LOAD GLTF / GLB 3D MODEL
    if (window.THREE && window.THREE.GLTFLoader) {
      try {
        const loader = new window.THREE.GLTFLoader();
        loader.load(url, function (gltf) {
          if (proceduralAvatarGroup) { scene.remove(proceduralAvatarGroup); proceduralAvatarGroup = null; }
          if (avatarModel) { scene.remove(avatarModel); avatarModel = null; }

          avatarModel = gltf.scene || gltf;

          avatarModel.traverse((child) => {
            if (child.isMesh) {
              child.castShadow = true;
              child.receiveShadow = true;
              if (child.material) {
                const mats = Array.isArray(child.material) ? child.material : [child.material];
                mats.forEach((m) => {
                  m.transparent = false;
                  m.opacity = 1.0;
                  m.side = THREE.DoubleSide;
                  m.depthWrite = true;
                });
              }
            }
          });

          try {
            const box = new THREE.Box3().setFromObject(avatarModel);
            const size = box.getSize(new THREE.Vector3());
            const center = box.getCenter(new THREE.Vector3());

            const maxDim = Math.max(size.x, size.y, size.z);
            if (maxDim > 0 && isFinite(maxDim)) {
              const scale = 1.6 / maxDim;
              avatarModel.scale.set(scale, scale, scale);
            }

            box.setFromObject(avatarModel);
            box.getCenter(center);
            avatarModel.position.sub(center);
            avatarModel.position.y += 0.8;
          } catch (e) {}

          scene.add(avatarModel);

          if (gltf.animations && gltf.animations.length > 0) {
            mixer = new THREE.AnimationMixer(avatarModel);
            const action = mixer.clipAction(gltf.animations[0]);
            action.play();
          }

          hideProgress();
          sendRNEvent({ type: 'MODEL_LOADED' });
        }, undefined, function (err) {
          console.warn('[STAGE] GLTF Load error:', err);
        });
      } catch (e) {
        console.warn('[STAGE] GLTF Loader exception:', e);
      }
    }
  }

  function processCommand(data) {
    if (!data || !data.type) return;

    switch (data.type) {
      case 'loadCustomModel':
      case 'setGender':
      case 'setEmoteFile':
      case 'equipAsset':
      case 'playEmoteAsset':
        const targetUrl = data.modelUrl || data.emoteUrl || (data.asset && data.asset.assetUrl);
        if (targetUrl) {
          load3DModelDirect(targetUrl);
        }
        break;
    }
  }

  window.processCommand = processCommand;

  window.addEventListener('message', function (e) {
    try {
      const data = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
      processCommand(data);
    } catch (err) {}
  });

  document.addEventListener('message', function (e) {
    try {
      const data = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
      processCommand(data);
    } catch (err) {}
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initEngine);
  } else {
    initEngine();
  }
})();

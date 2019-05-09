var milky_way = ['GalaxyTex_PositiveX.jpg', 'GalaxyTex_NegativeX.jpg', 'GalaxyTex_PositiveY.jpg', 'GalaxyTex_NegativeY.jpg', 'GalaxyTex_PositiveZ.jpg', 'GalaxyTex_NegativeZ.jpg',];

var light_blue = ['BlueNebular_left.jpg', 'BlueNebular_right.jpg', 'BlueNebular_top.jpg', 'BlueNebular_bottom.jpg', 'BlueNebular_front.jpg', 'BlueNebular_back.jpg',];

var blue = ['bkg1_left.jpg', 'bkg1_right.jpg', 'bkg1_top.jpg', 'bkg1_bottom.jpg', 'bkg1_front.jpg','bkg1_back.jpg',];
var red = ['bkg2_left.jpg', 'bkg2_right.jpg', 'bkg2_top.jpg', 'bkg2_bottom.jpg', 'bkg2_front.jpg', 'bkg2_back.jpg',];

var globalBackground = milky_way;

(function() {

    galaxysim.updateViewport = function(window, renderer, camera, skybox) {
        var w = window.innerWidth;
        var h = window.innerHeight;
        renderer.setSize(w, h);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        skybox.camera.aspect = w / h;
        skybox.camera.updateProjectionMatrix();
    };

    function createCloudGeometryFromBodies(bodies) {
        // create the particle variables
        var particleCount = bodies.length;
        var particles = new THREE.Geometry();
        var colors = new Array(particleCount);

        // now create the individual particles
        for (var p = 0; p < particleCount; p++) {
            particle = bodies[p].position;
            // add it to the geometry
            particles.vertices.push(particle);
            colors[p] = new THREE.Color(1,1,1);
        }
        particles.colors = colors;
        return particles;
    }

    function colorParticles(bodies, pointCloud, colorSelectingFunc) {
        var particleCount = bodies.length;
        var particles = new THREE.Geometry();

        for (var p = 0; p < particleCount; p++) {
            particle = bodies[p].position;
            var massFactor = bodies[p].mass / galaxysim.TYPICAL_STAR_MASS;

            colorSelectingFunc(bodies[p], pointCloud.geometry.colors[p]);
        }
        pointCloud.geometry.colorsNeedUpdate = true;
    }

    function colorStar(body, existingColor) {
        if(body.mass > 0.9999*galaxysim.TYPICAL_STAR_MASS * 100) {
            // Black hole color
            color = new THREE.Color(0,0,0); }
        else {
            // Normal color
            var massFactor = body.mass / galaxysim.TYPICAL_STAR_MASS;

            if(massFactor < 0.002) {
                existingColor.setRGB(0.9+0.1*Math.random(), 0.4 + 0.4*Math.random(), 0.4 + 0.4 * Math.random());
            }
            else if(massFactor < 0.004) {
                existingColor.setRGB(0.5+0.1*Math.random(), 0.5 + 0.2*Math.random(), 0.9 + 0.1 * Math.random());
            } else {
                existingColor.setRGB(0.6+0.4 * massFactor, 0.6+0.4 * massFactor, 0.5 + 0.3 * massFactor);
            }
        }
    }

    function colorGasCloud(body, existingColor) {
        var massFactor = body.mass / galaxysim.TYPICAL_STAR_MASS;
        existingColor.setHSL(0.665 + Math.random() * 0.335, 0.9, 0.5 + 0.5*Math.random());
    }



    function createSkyboxStuff(urls) {
        // Make a skybox

        var skyboxScene = new THREE.Scene();
        var skyboxCamera = new THREE.PerspectiveCamera(
            45,
            window.innerWidth / window.innerHeight,
            100,
            60000
        );

        var cubemap = new THREE.CubeTextureLoader()
            .setPath( 'textures/cubemaps/' )
            .load(urls);

        cubemap.format = THREE.RGBFormat;

        var skyboxShader = THREE.ShaderLib['cube']; // init cube shader from built-in lib
        skyboxShader.uniforms['tCube'].value = cubemap; // apply textures to shader

        // create shader material
        var skyBoxMaterial = new THREE.ShaderMaterial( {
          fragmentShader: skyboxShader.fragmentShader,
          vertexShader: skyboxShader.vertexShader,
          uniforms: skyboxShader.uniforms,
          depthWrite: false,
          side: THREE.BackSide
        });

        // create skybox mesh
        var skybox = new THREE.Mesh(
          new THREE.BoxGeometry(50000,50000,50000),
          skyBoxMaterial
        );
        skyboxScene.add(skybox);

        return { scene: skyboxScene, camera: skyboxCamera };
    }


    function render_all(urls) {
        var renderer = new THREE.WebGLRenderer({antialias: false});
        renderer.setSize( 300, 200 );
        // renderer.setPixelRatio( window.devicePixelRatio ); // adapt to retina display (runs slower)
        renderer.setPixelRatio( 1 );
        renderer.setClearColor(0x000000);
        renderer.sortObjects = false;
        document.body.appendChild(renderer.domElement);
        var scene = new THREE.Scene();

        

        var camera = new THREE.PerspectiveCamera(
            45,         // Field of view
            1200 / 800,  // Aspect ratio
            .0001 * galaxysim.MILKY_WAY_DIAMETER * galaxysim.UNIVERSE_SCALE,         // Near
            20 * galaxysim.MILKY_WAY_DIAMETER * galaxysim.UNIVERSE_SCALE       // Far
        );

        var controls = new THREE.OrbitControls( camera, renderer.domElement );

        controls.minDistance = 300;
        controls.maxDistance = 7000;

        controls.autoRotate = true;
        controls.autoRotateSpeed = 0.2;

        camera.position.set(2870, 1070, -275);

        var skybox = createSkyboxStuff(urls);
        galaxysim.updateViewport(window, renderer, camera, skybox);
        window.addEventListener('resize', function() {galaxysim.updateViewport(window, renderer, camera, skybox)});


        var materials = galaxysim.createAllMaterials();

        var FAR_UPDATE_PERIOD = 2.0; // How long between updates of far interactions
        var FAR_BODYCOUNT_PER_60FPS_FRAME = Math.max(1, Math.ceil(galaxysim.BODYCOUNT / (120*FAR_UPDATE_PERIOD)));
        // console.log("FAR_BODYCOUNT_PER_60FPS_FRAME", FAR_BODYCOUNT_PER_60FPS_FRAME);

        var blackholearray =[]
        var bodies = galaxysim.createGravitySystem(galaxysim.BODYCOUNT, galaxysim.TYPICAL_STAR_MASS, galaxysim.NUMBLACKHOLES, blackholearray);
        for (var i = 0; i < galaxysim.NUMBLACKHOLES; i ++ ){
          blackholearray.push(bodies[i].position)
        }
        var bodiesVfx = galaxysim.createGravitySystem(galaxysim.BODYCOUNT_VFX, 0.3*galaxysim.TYPICAL_STAR_MASS, 0, blackholearray);
        var bodiesGas = galaxysim.createGravitySystem(galaxysim.BODYCOUNT_GAS, 0.2*galaxysim.TYPICAL_STAR_MASS, 0, blackholearray);


        var mesh = new THREE.PointCloud( createCloudGeometryFromBodies(bodies), materials.bright );
        mesh.frustumCulled = false;
        var meshVfx = new THREE.PointCloud( createCloudGeometryFromBodies(bodiesVfx), materials.brightSmall );
        meshVfx.frustumCulled = false;
        var meshGas = new THREE.PointCloud( createCloudGeometryFromBodies(bodiesGas), materials.gasCloud );
        meshGas.frustumCulled = false;

        colorParticles(bodies, mesh, colorStar);
        colorParticles(bodiesVfx, meshVfx, colorStar);
        colorParticles(bodiesGas, meshGas, colorGasCloud);

        // Add desired order of rendering
        scene.add(meshGas);
        scene.add(mesh);
        scene.add(meshVfx);

        var CAMERA_MODES = {ORBIT: 0, CUSTOM: 2}
        var cameraMode = CAMERA_MODES.CUSTOM;

        var TIME_SCALE = Math.pow(10, 9);
        var timeScale = TIME_SCALE;

        // reset initial parameters (in case of restart of scene)
        galaxysim.GRAVITATIONAL_CONSTANT = 0.5 * galaxysim.G;
        galaxysim.G_SCALE = 0.5; 
               
        var PAUSED = false;

        $("body").on("keypress", function(e) {
            if (_.contains([32], e.which)) {
                PAUSED = !PAUSED;
            } else if (_.contains([114], e.which)) {
                controls.autoRotate = !controls.autoRotate;
            }
            else if(_.contains([49], e.which)) {
                makeCameraTransition(function() {
                    cameraMode = CAMERA_MODES.CUSTOM;
                });
            }
            else if(_.contains([50], e.which)) {
                makeCameraTransition(function() {
                    cameraMode = CAMERA_MODES.ORBIT;
                });
            }
        });

        function makeCameraTransition(transitionFunc) {
            $("#loading_cover").fadeIn(300, function() {
                transitionFunc();
                $("#loading_cover").fadeOut(300);
            });
        }

        function render() {
            renderer.autoclear = false;
            renderer.autoClearColor = false;
            skybox.camera.quaternion.copy(camera.quaternion);
            renderer.render(skybox.scene, skybox.camera);
            renderer.render(scene, camera);
        }

        var lastT = 0.0;
        var accumulatedFarDt = 0.0;
        var update_counter = 0;
        var accumulatedRealDtTotal = 0.0;
        var gravityApplicator = galaxysim.createTwoTierSmartGravityApplicator(bodies, bodies);
        var gravityApplicatorVfx = galaxysim.createTwoTierSmartGravityApplicator(bodiesVfx, bodies);
        var gravityApplicatorGas = galaxysim.createTwoTierSmartGravityApplicator(bodiesGas, bodies);
        gravityApplicator.updateForces(bodies.length);
        gravityApplicatorVfx.updateForces(bodiesVfx.length);
        gravityApplicatorGas.updateForces(bodiesGas.length);

        var started = false;
        THREE.DefaultLoadingManager.onProgress = function (item, loaded, total) {
            var loadingMessage = "Never apologize for burning too brightly or collapsing into yourself. That is how galaxies are made.";
            $("#loading_indicator .loading_text").text(loadingMessage);
            $("#loading_indicator .loading_bar").width(100*loaded/total + "%");
            if(loaded === total && !started) {
                started = true;
                $("#loading_indicator").delay(200).fadeOut(400);
                $("#loading_cover").delay(600).fadeOut(1000);
                $("#footnote").delay(5000).fadeOut(2000);
                startGalaxySimulation();
            }
        };


        

        function flattenToDisk(bodies) {
            for (var i=0; i < bodies.length; i++) {
                if (Math.abs(bodies[i].position.y) > 100 &&
                    (bodies[i].position.y > 0 && bodies[i].velocity.y > 0
                    || bodies[i].position.y < 0 && bodies[i].velocity.y < 0))
                        bodies[i].velocity.y /= 2;
            }
        }


        function startGalaxySimulation() {
            function update(t) {
                var dt = (t - lastT) * 0.001;
                dt = Math.min(1 / 60.0, dt); // Clamp
                accumulatedRealDtTotal += dt;

                var positionScale = 1.5 * galaxysim.MILKY_WAY_DIAMETER * galaxysim.UNIVERSE_SCALE;

                if (cameraMode === CAMERA_MODES.ORBIT) {
                    var cameraRotationSpeed = 0.01; // default: 0.03
                    camera.position.copy(bodies[0].position);
                    camera.position.add(new THREE.Vector3(
                        Math.cos(accumulatedRealDtTotal*cameraRotationSpeed) * positionScale,
                        0.5 * positionScale * 0.7 * Math.sin(accumulatedRealDtTotal * 0.2), // scale to slow vertical movement
                        Math.sin(accumulatedRealDtTotal*cameraRotationSpeed) * positionScale
                    ));

                    var cameraLookatRotationSpeed = 0; // default: 0.01
                    var cameraLookAtScale = 0.2 * positionScale;
                    var cameraLookAtPos = new THREE.Vector3().copy(bodies[0].position);
                    cameraLookAtPos.add(new THREE.Vector3(Math.cos(accumulatedRealDtTotal*cameraLookatRotationSpeed) * cameraLookAtScale, -positionScale * 0.07 * Math.sin(accumulatedRealDtTotal * 0.2), Math.sin(accumulatedRealDtTotal*cameraLookatRotationSpeed) * cameraLookAtScale))
                    camera.lookAt(cameraLookAtPos);
                }


                dt *= timeScale;
                accumulatedFarDt += dt;

                // This step updates positions
                galaxysim.PointMassBody.velocityVerletUpdate(bodies, dt, true);
                galaxysim.PointMassBody.velocityVerletUpdate(bodiesVfx, dt, true);
                galaxysim.PointMassBody.velocityVerletUpdate(bodiesGas, dt, true);

                for(var i=0, len=bodies.length; i<len; i++) {
                    mesh.geometry.vertices[i].copy(bodies[i].position);
                }

                for(var i=0, len=bodiesVfx.length; i<len; i++) {
                    meshVfx.geometry.vertices[i].copy(bodiesVfx[i].position);
                }

                for(var i=0, len=bodiesGas.length; i<len; i++) {
                    meshGas.geometry.vertices[i].copy(bodiesGas[i].position);
                }

                // This step updates velocities, so we can reuse forces for next position update (they will be the same because positios did not change)
                if (accumulatedFarDt >= TIME_SCALE / 60.0) {
                    gravityApplicator.updateForces(FAR_BODYCOUNT_PER_60FPS_FRAME);
                    gravityApplicatorVfx.updateForces(FAR_BODYCOUNT_PER_60FPS_FRAME*20);
                    gravityApplicatorGas.updateForces(FAR_BODYCOUNT_PER_60FPS_FRAME);
                    accumulatedFarDt -= TIME_SCALE/60;
                    update_counter = (update_counter + 1) % 100;
                }

                if (update_counter === 0 && galaxysim.G_SCALE < 2.0) {
                    galaxysim.GRAVITATIONAL_CONSTANT = galaxysim.G_SCALE * galaxysim.G;
                    galaxysim.G_SCALE += 0.05;
                    mesh.material.opacity += 0.034;
                    meshVfx.material.opacity += 0.034;
                }

                if (update_counter === 0) {
                    flattenToDisk(bodies);
                    flattenToDisk(bodiesVfx);
                    flattenToDisk(bodiesGas);
                }

                galaxysim.PointMassBody.velocityVerletUpdate(bodies, dt, false);
                galaxysim.PointMassBody.velocityVerletUpdate(bodiesVfx, dt, false);
                galaxysim.PointMassBody.velocityVerletUpdate(bodiesGas, dt, false);

                mesh.geometry.verticesNeedUpdate = true;
                meshVfx.geometry.verticesNeedUpdate = true;
                meshGas.geometry.verticesNeedUpdate = true;
                lastT = t;
            };

            function handleAnimationFrame(dt) {
                if (!PAUSED) {
                    update(dt);
                    controls.update();
                }
                render();
                window.requestAnimationFrame(handleAnimationFrame);
            };
            window.requestAnimationFrame(handleAnimationFrame);

        };
    };

    function displayGUI() {
            var testParameters = function() {
                this.numblackholes = galaxysim.NUMBLACKHOLES;
                this.backgrounds = milky_way;
                this.gravity_strength = 1.0;
            };

            console.log("displaying the dat.gui GUI");
            var text = new testParameters();
            var gui = new dat.GUI();
            var f1 = gui.addFolder('Blackholes');
            var f2 = gui.addFolder('Backgrounds');
            var f3 = gui.addFolder('Gravitational Constant');
            var numblackholes = f1.add(text, 'numblackholes').min(galaxysim.NUMBLACKHOLES).max(5*galaxysim.NUMBLACKHOLES).step(1).listen();
            var backgrounds = f2.add(text, 'backgrounds', {milky_way, light_blue, blue, red});
            var gravity_strength = f3.add(text, 'gravity_strength').min(0.1).max(100).step(0.1).listen();
            gui.remember(testParameters);

            numblackholes.onFinishChange(function(value) {
                numblackholes.initialValue = galaxysim.NUMBLACKHOLES;
                galaxysim.NUMBLACKHOLES = value;
                if (galaxysim.NUMBLACKHOLES != numblackholes.initialValue) {
                    render_all(globalBackground);
                }
            });

            backgrounds.onFinishChange(function(value) {
                if (typeof value === 'string') {
                    globalBackground = value.split(",");
                }  
                if (globalBackground != backgrounds.initialValue) {
                    render_all(globalBackground);
                }
            });

            gravity_strength.onFinishChange(function(value) {
                galaxysim.GRAVITATIONAL_CONSTANT *= value;
            });

        }

    $(document).ready(function() {
        displayGUI();
        render_all(milky_way);
    });
})();

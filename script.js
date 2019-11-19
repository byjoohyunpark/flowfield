

//main
var cnv;
var scene;
var playerCamera;
var renderer;
var gpu = new GPU();

//perlin noise scale
var noiseScale = 0.4;
var noiseSeeds = [65, 58, 36, 27, 9, 3, 71, 12, 636, 496, 520, 381]
var currentSeed = 58;
var nextSeed = 58;
var seedTextAlpha = 0;
var seedInput;
var nextSeedButton;
var keepSeedButton;
var hideUIButton;

//3d vector grid
var gridSize = 25;
var grid = new Float32Array(Math.pow(gridSize, 3) * 3);
var keepGrid = false;

//distance between flowfield-vectors
var viewScale = 0.8;

//outer radius
var maxRadius = (gridSize * viewScale) / 2

//time counter for new flowField
var maxTimeout = 2500;
var timeCounter = 0;
var timeReset = 0;

//particle array
var particleCount = 100000;
var pointCloud;
var pointCloudVertices = new Float32Array(particleCount * 3);
var pointCloudVertexDirections = new Float32Array(particleCount * 3);
var pointCloudMagnitudes = new Float32Array(particleCount);

//particle Variables
var steeringForce = 0.0008;
var maxSpeed = 0.03;
var maxAge = 50000;

//camera rotation
var cameraRotateSpeed = 0.002;
var cameraAngle = 0;
var cameraHeight = 0;
var cameraDistance = maxRadius * 2;

//mobile check
let mobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

//colors
var colors = [];
colors[0] = new THREE.Color().fromArray([0.07058823529411765 * 2, 0.00392156862745098 * 2, 0.396078431372549 * 2]);
colors[1] = new THREE.Color().fromArray([0.00392156862745098 * 2, 0.03529411764705882 * 2, 0.396078431372549 * 2]);
colors[2] = new THREE.Color().fromArray([0.00392156862745098 * 2, 0.13333333333333333 * 2, 0.396078431372549 * 2]);
colors[3] = new THREE.Color().fromArray([0.00392156862745098 * 2, 0.23137254901960785 * 2, 0.396078431372549 * 2]);
colors[4] = new THREE.Color().fromArray([0.00392156862745098 * 2, 0.32941176470588235 * 2, 0.396078431372549 * 2]);

//song and play/stop buttons;
var muteImg;
var playImg;
var song;







function setup() {

	initP5();

	initDom();

	generateFlowField(58);

	init3dScene();
}










function draw() {
	if (mobile) return;

	//draw seed number
	clear();
	stroke(5, 213, 255, seedTextAlpha);
	fill(5, 213, 255, seedTextAlpha / 10);
	textSize(width / 4);
	text(currentSeed, (height / 5) - 5, 55);
	if (nextSeed != currentSeed) seedTextAlpha -= 10;
	if (nextSeed == currentSeed && seedTextAlpha < 255) seedTextAlpha += 5;
	if (seedTextAlpha <= 0) {
		currentSeed = nextSeed;
	}


	//animate particles
	let delta = 60 / (frameRate() || 1);

	timeCounter += delta;
	if (timeCounter > maxTimeout) {
		timeCounter = 0;
		if (!keepGrid) generateFlowField();
		timeReset = 100;
	}

	if (timeReset) {
		slowParticleReset();
		timeReset--;
	}

	pointCloudVertexDirections = computeParticleDirections(
		new Array(pointCloudVertices),
		new Array(pointCloudVertexDirections),
		new Array(grid),
		maxRadius,
		gridSize,
		steeringForce,
		maxSpeed * delta
	);

	pointCloudVertices = ComputeParticlePositions(
		new Array(pointCloudVertices),
		new Array(pointCloudVertexDirections),
		maxRadius,
	);

	pointCloudMagnitudes = ComputeDirectionMagnitudes(
		new Array(pointCloudMagnitudes),
		new Array(pointCloudVertexDirections)
	);

	pointCloud.geometry.attributes.position.array = pointCloudVertices;
	pointCloud.geometry.attributes.position.needsUpdate = true;

	pointCloud.geometry.attributes.magnitude.array = pointCloudMagnitudes;
	pointCloud.geometry.attributes.magnitude.needsUpdate = true;

	pointCloud.material.uniforms.camDist.value = cameraDistance;

	MoveCamera();
	renderer.render(scene, playerCamera);

}




function mouseDragged() {
	cameraAngle += (winMouseX - pwinMouseX) * 0.001;
	cameraHeight = constrain(cameraHeight + (winMouseY - pwinMouseY) * 0.05, -10, 10);
}

function mouseWheel(e) {
	let delta;
	(e.delta > 0) ? delta = 1 : delta = -1;
	cameraDistance = constrain(cameraDistance + delta, maxRadius * 0.5, maxRadius * 2.5);
}

function windowResized() {
	renderer.setSize(windowWidth, windowHeight);
	playerCamera.aspect = windowWidth / windowHeight;
	playerCamera.updateProjectionMatrix();

	let size = min(windowWidth, windowHeight) * 0.3;
	cnv = resizeCanvas(size, size);

	muteImg.position(windowWidth - 20 - height * 0.15, 25);
	muteImg.size(height * 0.15, height * 0.15);
	playImg.position(windowWidth - 20 - height * 0.15, 25);
	playImg.size(height * 0.15, height * 0.15);
	link.position(windowWidth - link.width + 10, 5);

	seedInput.size(width * 0.8, 25);
	seedInput.position(width * 0.2, 5);

	let buttonwidth = (seedInput.width / 3) - 3;

	keepSeedButton.size(buttonwidth, 20);
	keepSeedButton.position(width * 0.2, 35);
	nextSeedButton.size(buttonwidth, 20);
	nextSeedButton.position(width * 0.2 + buttonwidth + 5, 35);
	hideUIButton.size(buttonwidth, 20);
	hideUIButton.position(width * 0.2 + buttonwidth * 2 + 10, 35);

	let buttonsize = (height / 5) - 15;
	for (var i = 0; i < 5; i++) {
		let button = colorButtons[i];
		button.size(buttonsize, buttonsize);
		button.position(5, 5 + i * buttonsize + i * 5);
	}
}

function MoveCamera() {
	if (!mouseIsPressed) cameraAngle += cameraRotateSpeed;


	playerCamera.position.set(cameraDistance * cos(cameraAngle), cameraHeight, cameraDistance * sin(cameraAngle))
	playerCamera.lookAt(new THREE.Vector3());

}

function slowParticleReset() {
	for (var i = 0; i < 800; i++) {
		var rndIndex = floor(random(particleCount));
		pointCloudVertices[rndIndex * 3] = random(-gridSize, gridSize);
		pointCloudVertices[rndIndex * 3 + 1] = random(-gridSize, gridSize);
		pointCloudVertices[rndIndex * 3 + 2] = random(-gridSize, gridSize);

		pointCloudVertexDirections[rndIndex * 3] = 0;
		pointCloudVertexDirections[rndIndex * 3 + 1] = 0;
		pointCloudVertexDirections[rndIndex * 3 + 2] = 0;

		pointCloudMagnitudes[rndIndex] = 0;
	}
}

function generateFlowField(r) {
	if (!r) {
		do {
			r = noiseSeeds[floor(random(noiseSeeds.length))]
		} while (r == currentSeed);
	}

	noiseSeed(r);
	nextSeed = r;

	let gridOffset = (x, y, z) => ((y * (gridSize * gridSize)) + (x * gridSize) + z) * 3;
	for (var y = 0; y < gridSize; y++) {
		for (var x = 0; x < gridSize; x++) {
			for (var z = 0; z < gridSize; z++) {
				let offset = gridOffset(x, y, z);
				grid[offset] = (noise(x * noiseScale, y * noiseScale) * 2 - 1);
				grid[offset + 1] = (noise(y * noiseScale, z * noiseScale) * 2 - 1);
				grid[offset + 2] = (noise(z * noiseScale, x * noiseScale) * 2 - 1);
			}
		}
	}
}












function initP5() {
	//init p5
	let size = min(windowWidth, windowHeight) * 0.3;
	cnv = createCanvas(size, size);
	stroke(5, 213, 255, 255);
	fill(5, 213, 255, 255);
	strokeWeight(1);
	textSize(size * 0.3)
	textAlign(LEFT, TOP);
	pixelDensity(1);

	if (mobile) {
		resizeCanvas(windowWidth, windowHeight);
		textSize(height * 0.05);
		text("This\napp\nis\nnot\nsupported\non\nmobile\ndevices.", width / 2, height / 2);
		noLoop();
		return;
	}
}



function initDom() {

	// song = loadSound("resources/Rahspberry.mp3", function(){
	// 	if (playImg.elt.style.display == "none") song.loop(0, 1, 0.1);
	// });

	// playImg = createImg("resources/playaudio.png").hide();
	// playImg.position(windowWidth - 20 - height*0.15, 25);
	// playImg.size(height * 0.15, height * 0.15);
	// playImg.style("z-index", 2);
	// playImg.mousePressed(function(){
	// 	playImg.hide();
	// 	muteImg.show();
	// 	song.loop(0, 1, 0.1);
	// });

	// muteImg = createImg("resources/muteaudio.png");
	// muteImg.position(windowWidth - 20 - height*0.15, 25);
	// muteImg.size(height * 0.15, height * 0.15);
	// muteImg.style("z-index", 2);
	// muteImg.mousePressed(function(){
	// 	muteImg.hide();
	// 	playImg.show();
	// 	song.stop();
	// });

	// link = createA('https://soundcloud.com/user-891186916', 'Ethan Hermsey - Rahspberry', "_blank");
	// link.elt.style.position = "absolute";
	// link.elt.style.fontFamily = "Arial, Helvetica, sans-serif";
	// link.elt.style.fontSize = "80%"
	// link.elt.style.color = "rgb(5, 213, 255)";
	// link.position(windowWidth - link.width + 10, 5);



	//p5 dom stuff 
	seedInput = createInput();
	seedInput.size(width * 0.8, 25);
	seedInput.position(width * 0.2, 5);
	seedInput.elt.placeholder = "Input seed..";
	seedInput.elt.type = "number";
	seedInput.elt.style.textAlign = "center";
	seedInput.elt.style.zIndex = 2;
	seedInput.elt.style.backgroundColor = "rgb(0,0,0)"
	seedInput.elt.style.color = "rgb(5, 213, 255)";
	seedInput.elt.style.borderStyle = "none";
	seedInput.elt.style.outline = "solid 1px rgb(5, 213, 255)";

	seedInput.elt.onkeydown = function (k) {
		if (k.key == "Enter") {
			timeCounter = 0;
			generateFlowField(seedInput.elt.value);
			timeReset = 100;
			seedInput.elt.value = "";
			seedInput.elt.blur();
		}
	};


	let buttonwidth = (seedInput.width / 3) - 3;

	keepSeedButton = createButton('keep seed');
	keepSeedButton.size(buttonwidth, 20);
	keepSeedButton.position(width * 0.2, 35);
	keepSeedButton.elt.style.zIndex = 2;
	keepSeedButton.elt.style.background = "rgb(0,0,0)";
	keepSeedButton.elt.style.border = "solid 1px rgb(5, 213, 255)";
	keepSeedButton.elt.style.color = "rgb(5, 213, 255)";
	keepSeedButton.elt.style.outline = "none";
	keepSeedButton.elt.style.overflow = "hidden";

	keepSeedButton.mouseClicked(() => {
		keepGrid = !keepGrid;
		if (keepGrid) {
			keepSeedButton.elt.style.background = "rgba(5, 213, 255, 0.5)";
		} else {
			keepSeedButton.elt.style.background = "rgb(0,0,0)";
		}
	});

	nextSeedButton = createButton('next seed');
	nextSeedButton.size(buttonwidth, 20);
	nextSeedButton.position(width * 0.2 + buttonwidth + 5, 35);
	nextSeedButton.elt.style.zIndex = 2;
	nextSeedButton.elt.style.background = "rgb(0,0,0)";
	nextSeedButton.elt.style.border = "solid 1px rgb(5, 213, 255)";
	nextSeedButton.elt.style.color = "rgb(5, 213, 255)";
	nextSeedButton.elt.style.overflow = "hidden";

	nextSeedButton.mouseClicked(() => {
		generateFlowField();
		timeReset = 100;
		nextSeedButton.elt.blur();
	});

	hideUIButton = createButton('hide UI');
	hideUIButton.size(buttonwidth, 20);
	hideUIButton.position(width * 0.2 + buttonwidth * 2 + 10, 35);
	hideUIButton.elt.style.zIndex = 2;
	hideUIButton.elt.style.background = "rgb(0,0,0)";
	hideUIButton.elt.style.border = "solid 1px rgb(5, 213, 255)";
	hideUIButton.elt.style.color = "rgb(5, 213, 255)";
	hideUIButton.elt.style.overflow = "hidden";

	hideUIButton.mouseClicked(() => {
		if (renderer.domElement.requestFullScreen) {
			renderer.domElement.requestFullScreen();
		} else if (renderer.domElement.webkitRequestFullScreen) {
			renderer.domElement.webkitRequestFullScreen();
		} else if (renderer.domElement.mozRequestFullScreen) {
			renderer.domElement.mozRequestFullScreen();
		}
	});

	colorButtons = [];
	let buttonsize = (height / 5) - 15;
	for (var i = 0; i < 5; i++) {
		let button = colorButtons[i] = createButton("");
		button.size(buttonsize, buttonsize);
		button.position(5, 5 + i * buttonsize + i * 5);
		button.elt.style.background = colors[i].getStyle();
		button.elt.style.border = "none";
		button.elt.style.zIndex = 2;
		button.index = i;
		button.mouseClicked(function () {
			colorPallet.index = this.index;
			colorPallet.elt.value = "#" + colors[this.index].getHexString();
			colorPallet.elt.click();
			this.elt.blur();
		});
	}

	colorPallet = createElement("input").hide();
	colorPallet.elt.type = "color";
	colorPallet.input(function () {
		colors[this.index].set(this.elt.value);
		colorButtons[this.index].elt.style.background = colors[this.index].getStyle();
		pointCloud.material.uniforms["c" + (this.index + 1)].value = colors[this.index];
	});
}







function init3dScene() {
	//scene and renderer
	scene = new THREE.Scene();
	playerCamera = new THREE.PerspectiveCamera(64, windowWidth / windowHeight, 0.1, 1000);
	playerCamera.rotation.order = "YXZ"
	playerCamera.position.set(0, 0, 100);
	renderer = new THREE.WebGLRenderer({ antialias: true });
	renderer.setSize(windowWidth, windowHeight);
	document.body.appendChild(renderer.domElement);
	renderer.domElement.style.zIndex = -1;


	//initialze pointCloud
	let pointCloudGeo = new THREE.BufferGeometry();

	for (let i = 0; i < particleCount; i++) {
		for (let a = 0; a < 3; a++) {
			pointCloudVertices[i * 3 + a] = random(-maxRadius, maxRadius);
		}
		pointCloudMagnitudes[i] = 0;
	}

	pointCloudGeo.addAttribute('position', new THREE.Float32BufferAttribute(pointCloudVertices, 3));
	pointCloudGeo.addAttribute('magnitude', new THREE.Float32BufferAttribute(pointCloudMagnitudes, 1));

	pointCloudGeo.attributes.position.setDynamic(true);
	pointCloudGeo.attributes.magnitude.setDynamic(true);

	let pointCloudMat = new THREE.ShaderMaterial({
		uniforms: {
			sprite: {
				type: 't',
				value: new THREE.TextureLoader().load('./particle.png')
			},
			radius: {
				type: 'f',
				value: maxRadius
			},
			maxSpeed: {
				type: 'f',
				value: maxSpeed
			},
			camDist: {
				type: 'f',
				value: cameraDistance
			},
			c1: {
				type: 'c',
				value: colors[0]
			},
			c2: {
				type: 'c',
				value: colors[1]
			},
			c3: {
				type: 'c',
				value: colors[2]
			},
			c4: {
				type: 'c',
				value: colors[3]
			},
			c5: {
				type: 'c',
				value: colors[4]
			}
		},
		vertexShader: document.getElementById('vertexShader').textContent,
		fragmentShader: document.getElementById('fragmentShader').textContent,
		blending: THREE.AdditiveBlending,
		transparent: true,
	});


	pointCloud = new THREE.Points(pointCloudGeo, pointCloudMat);
	scene.add(pointCloud);



	//'background' sphere
	var sg = new THREE.SphereGeometry(maxRadius, 50, 50);
	var sm = new THREE.MeshPhongMaterial({
		color: new THREE.Color("hsl(225,100%,50%)"),
		emissive: new THREE.Color("hsl(185,100%,50%)"),
		emissiveIntensity: 0.1,
		transparent: true,
		opacity: 0.035,
		side: THREE.BackSide
	});
	var smesh = new THREE.Mesh(sg, sm);
	scene.add(smesh);

	//lights
	let amb = new THREE.AmbientLight(new THREE.Color("rgb(200,200,200)"), 2);
	scene.add(amb);
}
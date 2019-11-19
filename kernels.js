
const computeParticleDirections = gpu.createKernel(function (particles, directions, flowGrid, maxRadius, gridSize, steeringForce, maxSpeed) {

	let startOffset = this.thread.x % 3;

	let particlex = particles[this.thread.x - startOffset];
	let particley = particles[this.thread.x - startOffset + 1];
	let particlez = particles[this.thread.x - startOffset + 2];

	let x = Math.floor(map(particlex, -maxRadius, maxRadius, 0, gridSize - 1));
	let y = Math.floor(map(particley, -maxRadius, maxRadius, 0, gridSize - 1));
	let z = Math.floor(map(particlez, -maxRadius, maxRadius, 0, gridSize - 1));

	let gridOffset = ((y * (gridSize * gridSize)) + (x * gridSize) + z) * 3

	let acc = directions[this.thread.x];
	let v = flowGrid[gridOffset + startOffset];

	v *= steeringForce;
	acc += v;
	acc = clampEdge(acc, maxSpeed);

	acc *= 0.99;

	return acc;

}).setOutput([particleCount * 3])
	.setFunctions([
		function map(n, start1, stop1, start2, stop2) {
			return ((n - start1) / (stop1 - start1)) * (stop2 - start2) + start2;
		},
		function clampEdge(val, edge) {
			if (val < -edge) {
				return -edge;
			} else if (val > edge) {
				return edge;
			}
			return val;
		}
	]);



const ComputeParticlePositions = gpu.createKernel(function (particles, directions, maxRadius) {

	let acc = particles[this.thread.x];
	let v = directions[this.thread.x];

	acc += v;
	acc = wrapEdge(acc, maxRadius);

	return acc;

}).setOutput([particleCount * 3])
	.setFunctions([
		function wrapEdge(val, edge) {
			if (val < -maxRadius) {
				val = maxRadius - 0.1;
			} else if (val > maxRadius) {
				val = -maxRadius + 0.1;
			}
			return val;
		}
	]);


const ComputeDirectionMagnitudes = gpu.createKernel(function (magnitude, directions) {

	return Math.sqrt(directions[this.thread.x * 3] * directions[this.thread.x * 3] + directions[this.thread.x * 3 + 1] * directions[this.thread.x * 3 + 1] + directions[this.thread.x * 3 + 2] * directions[this.thread.x * 3 + 2])

}).setOutput([particleCount])
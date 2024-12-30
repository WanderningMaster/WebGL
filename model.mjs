class ArrayBufferIterable {
	constructor(array) {
		this.buffer = array;
		this.index = 0;
	}

	reset() {
		this.index = 0;
	}

	len() {
		return this.buffer.length
	}

	push_batch(...args) {
		for(const x of args) {
			this.push_next(x)
		}
	}

	push_next(x) {
		if (this.index > this.buffer.length - 1) {
			throw new Error('Reached the end of the TypedArray.');
		}
		this.buffer[this.index] = x;
		this.index += 1;
	}

	collect() {
		return this.buffer;
	}
}

export class Model {
	constructor(ctx, gl, shProgram) {
		this.iVertexBuffer = gl.createBuffer();
		this.iIndexBuffer = gl.createBuffer();
		this.iNormalBuffer = gl.createBuffer();
		this.iTangentBuffer = gl.createBuffer();
		this.iTexCoordsBuffer = gl.createBuffer();

		this.uSteps = ctx.u
		this.vSteps = ctx.v
		this.glCtx = gl
		this.shProgram = shProgram
		this.count = 0;

	}



	BufferData({vertices, indices, normals, texCoords, tangents}) {
		this.glCtx.bindBuffer(this.glCtx.ARRAY_BUFFER, this.iVertexBuffer);
		this.glCtx.bufferData(this.glCtx.ARRAY_BUFFER, vertices, this.glCtx.STATIC_DRAW);

		this.glCtx.bindBuffer(this.glCtx.ARRAY_BUFFER, this.iNormalBuffer);
		this.glCtx.bufferData(this.glCtx.ARRAY_BUFFER, normals, this.glCtx.STATIC_DRAW);

		this.glCtx.bindBuffer(this.glCtx.ARRAY_BUFFER, this.iTangentBuffer);
		this.glCtx.bufferData(this.glCtx.ARRAY_BUFFER, tangents, this.glCtx.STATIC_DRAW);

		this.glCtx.bindBuffer(this.glCtx.ARRAY_BUFFER, this.iTexCoordsBuffer);
		this.glCtx.bufferData(this.glCtx.ARRAY_BUFFER, texCoords, this.glCtx.STATIC_DRAW);

		this.glCtx.bindBuffer(this.glCtx.ELEMENT_ARRAY_BUFFER, this.iIndexBuffer);
		this.glCtx.bufferData(this.glCtx.ELEMENT_ARRAY_BUFFER, indices, this.glCtx.STATIC_DRAW);

		this.count = indices.length;
	};

	Draw() {
		this.glCtx.bindBuffer(this.glCtx.ARRAY_BUFFER, this.iVertexBuffer);
		this.glCtx.vertexAttribPointer(this.shProgram.iAttribVertex, 3, this.glCtx.FLOAT, false, 0, 0);
		this.glCtx.enableVertexAttribArray(this.shProgram.iAttribVertex);

		this.glCtx.bindBuffer(this.glCtx.ARRAY_BUFFER, this.iNormalBuffer);
		this.glCtx.vertexAttribPointer(this.shProgram.iAttribNormal, 3, this.glCtx.FLOAT, false, 0, 0);
		this.glCtx.enableVertexAttribArray(this.shProgram.iAttribNormal);

		this.glCtx.bindBuffer(this.glCtx.ARRAY_BUFFER, this.iTangentBuffer);
		this.glCtx.vertexAttribPointer(this.shProgram.iAttribTangent, 3, this.glCtx.FLOAT, false, 0, 0);
		this.glCtx.enableVertexAttribArray(this.shProgram.iAttribTangent);

		this.glCtx.bindBuffer(this.glCtx.ARRAY_BUFFER, this.iTexCoordsBuffer);
		this.glCtx.vertexAttribPointer(this.shProgram.iAttribTexCoord, 2, this.glCtx.FLOAT, false, 0, 0);
		this.glCtx.enableVertexAttribArray(this.shProgram.iAttribTexCoord);

		this.glCtx.bindBuffer(this.glCtx.ELEMENT_ARRAY_BUFFER, this.iIndexBuffer);
		this.glCtx.drawElements(this.glCtx.TRIANGLES, this.count, this.glCtx.UNSIGNED_SHORT, 0);
	};

	Eq(u, v) {
		const m = 6;
		const b = 6 * m;
		const a = 4 * m;
		const n = 0.1;
		const phi = 0;

		const w = m * Math.PI / b;
		const x = v * Math.cos(u);
		const y = v * Math.sin(u);
		const z = a * Math.pow(Math.E, -n * v) * Math.sin(w * v + phi);

		return {x,y,z}
	}

	CreateSurfaceData() {
		let vStepSize = 36 / this.vSteps;
		let uStepSize = (2 * Math.PI) / this.uSteps;

		const numVertices = (this.uSteps + 1) * (this.vSteps + 1);
		const numIndices  = this.uSteps * this.vSteps * 6;

		let vertices = new ArrayBufferIterable(new Float32Array(numVertices * 3));
		let texCoords = new ArrayBufferIterable(new Float32Array(numVertices * 2));
		let indices   = new ArrayBufferIterable(new Uint16Array(numIndices));

		let normals  = new ArrayBufferIterable(new Float32Array(numVertices * 3));
		let tangents = new ArrayBufferIterable(new Float32Array(numVertices * 3)); 

		const vertexPos  = [];
		const vertexUV   = [];

		for (let i = 0; i <= this.vSteps; i++) {
			for (let j = 0; j <= this.uSteps; j++) {
				let uVal = j * uStepSize;
				let vVal = i * vStepSize;

				let p = this.Eq(uVal, vVal);
				vertexPos.push([p.x, p.y, p.z]);

				let uTex = j / this.uSteps; 
				let vTex = i / this.vSteps; 
				vertexUV.push([uTex, vTex]);
			}
		}

		for (let i = 0; i < vertexPos.length; i++) {
			const [x, y, z] = vertexPos[i];
			const [u, v]    = vertexUV[i];

			vertices.push_batch(x, y, z);
			texCoords.push_batch(u, v);
		}

		for (let i = 0; i < this.vSteps; i++) {
			for (let j = 0; j < this.uSteps; j++) {
				let i0 = i*(this.uSteps+1) + j;
				let i1 = i0 + 1;
				let i2 = (i+1)*(this.uSteps+1) + j;
				let i3 = i2 + 1;

				indices.push_batch(i0, i2, i1);

				indices.push_batch(i1, i2, i3);
			}
		}

		const normalsAccum   = new Array(numVertices).fill(null).map(() => [0, 0, 0]);
		const tangentsAccum  = new Array(numVertices).fill(null).map(() => [0, 0, 0]);

		for (let f = 0; f < numIndices; f += 3) {
			let i0 = indices.buffer[f];
			let i1 = indices.buffer[f + 1];
			let i2 = indices.buffer[f + 2];

			let v0 = vertexPos[i0];
			let v1 = vertexPos[i1];
			let v2 = vertexPos[i2];

			let uv0 = vertexUV[i0];
			let uv1 = vertexUV[i1];
			let uv2 = vertexUV[i2];

			const [n, t] = this.computeFaceNormalAndTangent(
				{x: v0[0], y: v0[1], z: v0[2]}, 
				{x: v1[0], y: v1[1], z: v1[2]},
				{x: v2[0], y: v2[1], z: v2[2]},
				{u: uv0[0], v: uv0[1]},
				{u: uv1[0], v: uv1[1]},
				{u: uv2[0], v: uv2[1]}
			);

			for (let idxV of [i0, i1, i2]) {
				normalsAccum[idxV][0] += n[0];
				normalsAccum[idxV][1] += n[1];
				normalsAccum[idxV][2] += n[2];

				tangentsAccum[idxV][0] += t[0];
				tangentsAccum[idxV][1] += t[1];
				tangentsAccum[idxV][2] += t[2];
			}
		}

		for (let i = 0; i < numVertices; i++) {
			let n = normalsAccum[i];
			let t = tangentsAccum[i];

			normals.push_batch(n[0], n[1], n[2]);
			tangents.push_batch(t[0], t[1], t[2]);
		}

		return {
			vertices: vertices.collect(),
			indices: indices.collect(),
			normals: normals.collect(),
			texCoords: texCoords.collect(),
			tangents: tangents.collect()
		};
	}


	computeFaceNormalAndTangent(p0, p1, p2, uv0, uv1, uv2) {
		const p0vec = [p0.x, p0.y, p0.z]
		const p1vec = [p1.x, p1.y, p1.z]
		const p2vec = [p2.x, p2.y, p2.z]

		const edge1 = m4.subtractVectors(p1vec, p0vec);
		const edge2 = m4.subtractVectors(p2vec, p0vec);

		const deltaUv1 = {
			u: uv1.u - uv0.u,
			v: uv1.v - uv0.v
		}
		const deltaUv2 = {
			u: uv2.u - uv0.u,
			v: uv2.v - uv0.v
		}

		let tangent = {};
		const f = 1.0 / (deltaUv1.u * deltaUv2.v - deltaUv2.u * deltaUv1.v);
		tangent.x = f * (deltaUv2.v * edge1[0] + deltaUv1.v * edge2[0]);
		tangent.y = f * (deltaUv2.v * edge1[1] + deltaUv1.v * edge2[1]);
		tangent.z = f * (deltaUv2.v * edge1[2] + deltaUv1.v * edge2[2]);

		const n = m4.cross(edge1, edge2);
		const nNorm = m4.normalize(n)
		const tNorm = m4.normalize([tangent.x, tangent.y, tangent.z])

		return [nNorm, tNorm];
	}
}

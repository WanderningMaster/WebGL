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
		this.uSteps = ctx.u
		this.vSteps = ctx.v
		this.glCtx = gl
		this.shProgram = shProgram
		this.count = 0;

	}

	BufferData({vertices, indices, normals}) {
		this.glCtx.bindBuffer(this.glCtx.ARRAY_BUFFER, this.iVertexBuffer);
		this.glCtx.bufferData(this.glCtx.ARRAY_BUFFER, vertices, this.glCtx.STREAM_DRAW);

		this.glCtx.bindBuffer(this.glCtx.ARRAY_BUFFER, this.iNormalBuffer);
		this.glCtx.bufferData(this.glCtx.ARRAY_BUFFER, normals, this.glCtx.STATIC_DRAW);

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
		const vStepSize = 36 / this.vSteps;
		const uStepSize = 2 * Math.PI / this.uSteps;

		const totalTriangles = this.vSteps * this.uSteps * 2;
		const totalVertices  = totalTriangles * 3;

		let vertices = new ArrayBufferIterable(new Float32Array(totalVertices * 3));
		let normals  = new ArrayBufferIterable(new Float32Array(totalVertices * 3));
		let indices  = new ArrayBufferIterable(new Uint16Array(totalVertices));

		let idxOffset = 0;
		let v = 0;
		for (let vStep = 0; vStep < this.vSteps; vStep++) {
			let u = 0;
			for (let uStep = 0; uStep < this.uSteps; uStep++) {
				const p0 = this.Eq(u, v);
				const p1 = this.Eq(u + uStepSize, v);
				const p2 = this.Eq(u, v + vStepSize);
				const p3 = this.Eq(u + uStepSize, v + vStepSize);

				const n1 = this.computeFaceNormal(p0, p1, p2);

				vertices.push_batch(p0.x, p0.y, p0.z, p1.x, p1.y, p1.z, p2.x, p2.y, p2.z)
				normals.push_batch(n1[0], n1[1], n1[2], n1[0], n1[1], n1[2],n1[0], n1[1], n1[2])
				indices.push_batch(idxOffset++, idxOffset++, idxOffset++);

				const n2 = this.computeFaceNormal(p1, p3, p2);
				vertices.push_batch(p1.x, p1.y, p1.z, p3.x, p3.y, p3.z, p2.x, p2.y, p2.z)
				normals.push_batch(n2[0], n2[1], n2[2], n2[0], n2[1], n2[2],n2[0], n2[1], n2[2])
				indices.push_batch(idxOffset++, idxOffset++, idxOffset++);
				u += uStepSize;

			}
			v += vStepSize;
		}

		return {
			vertices: vertices.collect(),
			indices: indices.collect(),
			normals: normals.collect(),
		};
	}

	computeFaceNormal(p0, p1, p2) {
		const p0vec = [p0.x, p0.y, p0.z]
		const p1vec = [p1.x, p1.y, p1.z]
		const p2vec = [p2.x, p2.y, p2.z]
		const u = m4.subtractVectors(p1vec, p0vec);
		const v = m4.subtractVectors(p2vec, p0vec);

		const n = m4.cross(u, v);
		const nNorm = m4.normalize(n)

		return nNorm;
	}
}

'use strict';

let gl;                         // The webgl context.
let surface;                    // A surface model
let shProgram;                  // A shader program
let spaceball;                  // A SimpleRotator object that lets the user rotate the view by mouse.
let scaleFactor = 0.04;

function deg2rad(angle) {
	return angle * Math.PI / 180;
}


class Model {
	constructor(name) {
		this.name = name;
		this.iVertexBuffer = gl.createBuffer();
		this.count = 0;

	}

	BufferData(vertices) {
		gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STREAM_DRAW);

		this.count = vertices.length / 3;
	};

	Draw() {
		gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
		gl.vertexAttribPointer(shProgram.iAttribVertex, 3, gl.FLOAT, false, 0, 0);
		gl.enableVertexAttribArray(shProgram.iAttribVertex);

		gl.drawArrays(gl.LINE_STRIP, 0, this.count);
	};
}


class ShaderProgram {
	constructor(name, program) {
		this.name = name;
		this.prog = program;

		// Location of the attribute variable in the shader program.
		this.iAttribVertex = -1;
		// Location of the uniform specifying a color for the primitive.
		this.iColor = -1;
		// Location of the uniform matrix representing the combined transformation.
		this.iModelViewProjectionMatrix = -1;

	}
	Use() {
		gl.useProgram(this.prog);
	};
}


/* Draws a colored cube, along with a set of coordinate axes.
 * (Note that the use of the above drawPrimitive function is not an efficient
 * way to draw with WebGL.  Here, the geometry is so simple that it doesn't matter.)
 */
function draw() { 
	gl.clearColor(0,0,0,1);
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

	let projection = m4.perspective(Math.PI/8, 1, 8, 12); 

	let modelView = spaceball.getViewMatrix();

	let rotateToPointZero = m4.axisRotation([0.707,0.707,0], 0.7);
	let translateToPointZero = m4.translation(0,0,-10);

	let matAccum0 = m4.multiply(rotateToPointZero, modelView );
	let matAccum1 = m4.multiply(translateToPointZero, matAccum0 );

	let modelViewProjection = m4.multiply(projection, matAccum1 );

	gl.uniformMatrix4fv(shProgram.iModelViewProjectionMatrix, false, modelViewProjection );

	gl.uniform4fv(shProgram.iColor, [1,1,0,1] );

	gl.uniform3fv(gl.getUniformLocation(shProgram.prog, "scale"), Array(3).fill(scaleFactor));

	surface.Draw();
}

function CreateSurfaceData() {

	const m = 6;
	const b = 6 * m;
	const a = 4 * m;
	const n = 0.1;
	const phi = 0;
	const w = m * Math.PI / b;


	const rSteps = 50;
	const uSteps = 50;
	const numVerticesU = (rSteps + 1) * (uSteps + 1);
	const numVerticesV = (rSteps + 1) * (uSteps + 1);
	
	const verticesCount = numVerticesU + numVerticesV;
	let vertexList = new Float32Array(verticesCount * 3)
	let idx = 0;

	const rStepSize = b / rSteps;
	const uStepSize = (2 * Math.PI) / uSteps;

	let r = 0;
	for (let rStep = 0; rStep <= rSteps; rStep++) {
		let u = 0;
		for (let uStep = 0; uStep <= uSteps; uStep++) {
			const x = r * Math.cos(u);
			const y = r * Math.sin(u);
			const z = a * Math.pow(Math.E, -n * r) * Math.sin(w * r + phi);

			vertexList[idx++] = x;
			vertexList[idx++] = y;
			vertexList[idx++] = z;
			u += uStepSize
		}
		r += rStepSize
	}


	let u = 0;
	for (let uStep = 0; uStep <= uSteps; uStep++) {
		let r = 0;
		for (let rStep = 0; rStep <= rSteps; rStep++) {
			const x = r * Math.cos(u);
			const y = r * Math.sin(u);
			const z = a * Math.pow(Math.E, -n * r) * Math.sin(w * r + phi);

			vertexList[idx++] = x;
			vertexList[idx++] = y;
			vertexList[idx++] = z;
			r += rStepSize
		}
		u += uStepSize
	}

	return vertexList;
}


/* Initialize the WebGL context. Called from init() */
function initGL() {
    let prog = createProgram( gl, vertexShaderSource, fragmentShaderSource );

    shProgram = new ShaderProgram('Basic', prog);
    shProgram.Use();

    shProgram.iAttribVertex              = gl.getAttribLocation(prog, "vertex");
    shProgram.iModelViewProjectionMatrix = gl.getUniformLocation(prog, "ModelViewProjectionMatrix");
    shProgram.iColor                     = gl.getUniformLocation(prog, "color");

    surface = new Model('Surface');
    surface.BufferData(CreateSurfaceData());

    gl.enable(gl.DEPTH_TEST);
}


/* Creates a program for use in the WebGL context gl, and returns the
 * identifier for that program.  If an error occurs while compiling or
 * linking the program, an exception of type Error is thrown.  The error
 * string contains the compilation or linking error.  If no error occurs,
 * the program identifier is the return value of the function.
 * The second and third parameters are strings that contain the
 * source code for the vertex shader and for the fragment shader.
 */
function createProgram(gl, vShader, fShader) {
    let vsh = gl.createShader( gl.VERTEX_SHADER );
    gl.shaderSource(vsh,vShader);
    gl.compileShader(vsh);
    if ( ! gl.getShaderParameter(vsh, gl.COMPILE_STATUS) ) {
        throw new Error("Error in vertex shader:  " + gl.getShaderInfoLog(vsh));
     }
    let fsh = gl.createShader( gl.FRAGMENT_SHADER );
    gl.shaderSource(fsh, fShader);
    gl.compileShader(fsh);
    if ( ! gl.getShaderParameter(fsh, gl.COMPILE_STATUS) ) {
       throw new Error("Error in fragment shader:  " + gl.getShaderInfoLog(fsh));
    }
    let prog = gl.createProgram();
    gl.attachShader(prog,vsh);
    gl.attachShader(prog, fsh);
    gl.linkProgram(prog);
    if ( ! gl.getProgramParameter( prog, gl.LINK_STATUS) ) {
       throw new Error("Link error in program:  " + gl.getProgramInfoLog(prog));
    }
    return prog;
}


/**
 * initialization function that will be called when the page has loaded
 */
function init() {
	let canvas;
	try {
		canvas = document.getElementById("webglcanvas");
		gl = canvas.getContext("webgl");
		if ( ! gl ) {
			throw "Browser does not support WebGL";
		}
	}
	catch (e) {
		document.getElementById("canvas-holder").innerHTML =
			"<p>Sorry, could not get a WebGL graphics context.</p>";
		return;
	}
	try {
		initGL();  // initialize the WebGL graphics context
	}
	catch (e) {
		document.getElementById("canvas-holder").innerHTML =
			"<p>Sorry, could not initialize the WebGL graphics context: " + e + "</p>";
		return;
	}

	spaceball = new TrackballRotator(canvas, draw, 0);

	draw();
	canvas.addEventListener('wheel', handleScroll)
}

function handleScroll(ev) {
	let delta = -0.01;	
	if(ev.deltaY < 0) {
		delta *= -1;
	}
	scaleFactor = scaleFactor + delta;
	draw()
}

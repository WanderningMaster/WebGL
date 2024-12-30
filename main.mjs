'use strict';
import {Model} from './model.mjs'
import {LoadTexture} from './textures.mjs'


let gl;                         // The webgl context.
let surface;                    // A surface model
let shProgram;                  // A shader program
let spaceball;                  // A SimpleRotator object that lets the user rotate the view by mouse.

let ctx = {
	scaleFactor: 0.04,
	u: 50,
	v: 50,
	pivot: {
		u: 0.5,
		v: 0.5
	},
	texScale: 1.0
}

function debounce(func, wait) {
    let timeout;
    return function(...args) {
        const context = this;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), wait);
    };
}

function nextFrame() {
	ctx.v = +v.value
	ctx.u = +u.value
	surface = new Model(ctx, gl, shProgram)
	surface.BufferData(surface.CreateSurfaceData());
}


class ShaderProgram {
	constructor(name, program) {
		this.name = name;
		this.prog = program;

		this.iAttribVertex = -1;
		this.iAttribNormal = -1;
		this.iAttribTangent = -1;
		this.iAttribTexCoord = -1;
		this.iColor = -1;
		this.iModelViewProjectionMatrix = -1;
		this.iModelViewMatrix = -1;
		this.iNormalMatrix = -1;
		this.iLightDir = -1;
		this.iKa = -1;
		this.iKd = -1;
		this.iKs = -1;
		this.iSh = -1;

		this.diffuseMap = -1;
		this.specularMap = -1;
		this.normalMap = -1;

		this.pivot = -1;
		this.texScale = -1;
	}

	Use() {
		gl.useProgram(this.prog);
	};
}

function handlerKeydown(ev) {
	let step = 0.1	
	switch (ev.key) {
		case 'a':
			ctx.pivot.u = +Math.max(0.0, ctx.pivot.u - step).toFixed(2);
			break;
		case 'd':
			ctx.pivot.u = +Math.min(1.0, ctx.pivot.u + step).toFixed(2);
			break;
		case 'w': 
			ctx.pivot.v = +Math.min(1.0, ctx.pivot.v + step).toFixed(2);
			break;
		case 's': 
			ctx.pivot.v = +Math.max(0.0, ctx.pivot.v - step).toFixed(2);
			break;
		case 'q': 
			ctx.texScale = +Math.max(ctx.texScale - step, 1.0).toFixed(2);
			break;
		case 'e': 
			ctx.texScale = +Math.min(ctx.texScale + step, 10.0).toFixed(2);
			break;
	}

	let pivotLabel = document.getElementById('pivot')
	let scaleLabel = document.getElementById('texScale')

	pivotLabel.innerText = `Pivot point: (${ctx.pivot.u}, ${ctx.pivot.v})`
	scaleLabel.innerText = `Texture scale: ${ctx.texScale}`
}


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

	let normalMatrix4 = m4.transpose(m4.inverse(modelView));
	let normalMatrix = [
		normalMatrix4[1], normalMatrix4[4], normalMatrix4[7],
		normalMatrix4[0], normalMatrix4[3], normalMatrix4[6],
		normalMatrix4[2], normalMatrix4[5], normalMatrix4[8],
	]

	gl.uniformMatrix4fv(shProgram.iModelViewProjectionMatrix, false, modelViewProjection );
	gl.uniformMatrix4fv(shProgram.iModelViewMatrix, false, modelView );
	gl.uniformMatrix3fv(shProgram.iNormalMatrix, false, normalMatrix );

	gl.uniform3fv(shProgram.iLightDir, m4.transformPoint(modelViewProjection, [1, 1, -1.0]));

	gl.uniform1f(shProgram.iKa, 0.1);
	gl.uniform1f(shProgram.iKd, 0.7);
	gl.uniform1f(shProgram.iKs, 0.5);
	gl.uniform1f(shProgram.iSh, 2.0);
	gl.uniform4fv(shProgram.iColor, [1,1,1,1] );

	gl.uniform3fv(gl.getUniformLocation(shProgram.prog, "scale"), Array(3).fill(ctx.scaleFactor));

	gl.uniform1i(shProgram.diffuseMap, 0);
	gl.uniform1i(shProgram.specularMap, 1);
	gl.uniform1i(shProgram.normalMap, 2);
	gl.uniform2f(shProgram.pivot, ctx.pivot.u, ctx.pivot.v);
	gl.uniform1f(shProgram.texScale, ctx.texScale);

	surface.Draw();

	requestAnimationFrame(draw)
}


function loadTextures() {
	const diffuseMap = LoadTexture(gl, 'static/diffuse.png');
	const specularMap = LoadTexture(gl, 'static/specular.png');
	const normalMap = LoadTexture(gl, 'static/normal.png');

	gl.activeTexture(gl.TEXTURE0);
	gl.bindTexture(gl.TEXTURE_2D, diffuseMap);

	gl.activeTexture(gl.TEXTURE1);
	gl.bindTexture(gl.TEXTURE_2D, specularMap);

	gl.activeTexture(gl.TEXTURE2);
	gl.bindTexture(gl.TEXTURE_2D, normalMap);
}

/* Initialize the WebGL context. Called from init() */
function initGL() {
	let prog = createProgram( gl, vertexShaderSource, fragmentShaderSource );

	shProgram = new ShaderProgram('Basic', prog);
	shProgram.Use();

	shProgram.iAttribVertex              = gl.getAttribLocation(prog, "vertex");
	shProgram.iAttribNormal              = gl.getAttribLocation(prog, "normal");
	shProgram.iAttribTangent              = gl.getAttribLocation(prog, "tangent");
	shProgram.iAttribTexCoord            = gl.getAttribLocation(prog, "texCoord");

	shProgram.iModelViewProjectionMatrix = gl.getUniformLocation(prog, "ModelViewProjectionMatrix");
	shProgram.iModelViewMatrix           = gl.getUniformLocation(prog, "ModelViewMatrix");
	shProgram.iNormalMatrix              = gl.getUniformLocation(prog, "NormalMatrix");

	shProgram.iColor                     = gl.getUniformLocation(prog, "color");
	shProgram.iLightDir                  = gl.getUniformLocation(prog, "lightDir");
	shProgram.iKa			     = gl.getUniformLocation(prog, "Ka");
	shProgram.iKd			     = gl.getUniformLocation(prog, "Kd");
	shProgram.iKs			     = gl.getUniformLocation(prog, "Ks");
	shProgram.iSh			     = gl.getUniformLocation(prog, "Sh");

	shProgram.diffuseMap	             = gl.getUniformLocation(prog, "diffuseMap");
	shProgram.specularMap		     = gl.getUniformLocation(prog, "specularMap");
	shProgram.normalMap		     = gl.getUniformLocation(prog, "normalMap");

	shProgram.pivot		     	     = gl.getUniformLocation(prog, "pivot");
	shProgram.texScale		     = gl.getUniformLocation(prog, "texScale");

	surface = new Model(ctx, gl, shProgram)
	surface.BufferData(surface.CreateSurfaceData());
	loadTextures()

	gl.enable(gl.DEPTH_TEST);
}

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
		initGL();
	}
	catch (e) {
		console.error(e)
		document.getElementById("canvas-holder").innerHTML =
			"<p>Sorry, could not initialize the WebGL graphics context: " + e + "</p>";
		return;
	}
	let u = document.getElementById('u')
	let v = document.getElementById('v')

	let pivotLabel = document.getElementById('pivot')
	let scaleLabel = document.getElementById('texScale')

	pivotLabel.innerText = `Pivot point: (${ctx.pivot.u}, ${ctx.pivot.v})`
	scaleLabel.innerText = `Texture scale: ${ctx.texScale}`

	spaceball = new TrackballRotator(canvas, null, 0);

	canvas.addEventListener('wheel', handleScroll)

	u.value = 50
	v.value = 50
	u.addEventListener('input', debounce(nextFrame, 100))
	v.addEventListener('input', debounce(nextFrame, 100))
	window.addEventListener('keydown', handlerKeydown);

	draw()
}

function handleScroll(ev) {
	let delta = -0.01;	
	if(ev.deltaY < 0) {
		delta *= -1;
	}
	ctx.scaleFactor = ctx.scaleFactor + delta;

	nextFrame()
}

document.addEventListener("DOMContentLoaded", init);

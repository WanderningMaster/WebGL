// Vertex shader
const vertexShaderSource = `
attribute vec3 vertex;
attribute vec3 normal;
attribute vec3 tangent;
attribute vec2 texCoord;

uniform mat4 ModelViewProjectionMatrix;
uniform mat4 ModelViewMatrix;
uniform mat3 NormalMatrix;
uniform vec3 scale;

varying vec3 vEyePos;
varying vec2 vTexCoord;
varying mat3 TBN;
void main() {
    vec3 scaled = vertex * scale;

    vec4 eyePos = ModelViewMatrix * vec4(scaled, 1.0);
    vEyePos = eyePos.xyz;

    vec3 bitangent = cross(normal, tangent);
    TBN = mat3(normalize(NormalMatrix * tangent),
	normalize(NormalMatrix * bitangent),
        normalize(NormalMatrix * normal)
    );
    vTexCoord = texCoord;

    gl_Position = ModelViewProjectionMatrix * vec4(scaled, 1.0);
}
`;


// Fragment shader
const fragmentShaderSource = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
   precision highp float;
#else
   precision mediump float;
#endif

varying vec3 vEyePos;
varying vec2 vTexCoord;
varying mat3 TBN;

uniform vec4 color;
uniform vec3 lightDir;

uniform float Ka;
uniform float Kd;
uniform float Ks;
uniform float Sh;

uniform sampler2D diffuseMap;
uniform sampler2D specularMap;
uniform sampler2D normalMap;
void main() {
	vec3 diffuseColor = texture2D(diffuseMap, vTexCoord).rgb;
	vec3 specularColor = texture2D(specularMap, vTexCoord).rgb;
	vec3 normalMapData = texture2D(normalMap, vTexCoord).rgb;

	vec3 N = normalize(normalMapData * 2.0 - 1.0);
	N = normalize(TBN * N);

	vec3 L = normalize(lightDir);
	vec3 V = normalize(-vEyePos);

	vec3 ambient = Ka * color.rgb;

	float lambertian = max(dot(N, L), 0.0);
	vec3 diffuse = Kd * diffuseColor * lambertian;

	vec3 R = reflect(-L, N);
	float spec = 0.0;
	if(lambertian > 0.0) {
		spec = pow(max(dot(R, V), 0.0), Sh);
	}
	vec3 specular = Ks * specularColor.rgb * spec;

	vec3 finalColor = ambient + diffuse + specular;
	gl_FragColor = vec4(finalColor.rgb, 1.0);
}`;

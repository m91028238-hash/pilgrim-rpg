// Colour grading for every quality level, plus bloom + vignette on High.
import * as THREE from 'three';

// Low/Medium: grade inside the tone-mapping chunk (no extra pass)
THREE.ShaderChunk.tonemapping_fragment = `
#if defined( TONE_MAPPING )
  gl_FragColor.rgb = toneMapping( gl_FragColor.rgb );
  { vec3 c = gl_FragColor.rgb; float l = dot( c, vec3( 0.2126, 0.7152, 0.0722 ) );
    c = mix( vec3( l ), c, 1.04 );                                  // a touch more saturation
    c *= mix( vec3( 0.97, 0.99, 1.04 ), vec3( 1.04, 1.0, 0.93 ), smoothstep( 0.05, 0.6, l ) ); // cool shadows, warm highlights
    c = mix( c, c * c * ( 3.0 - 2.0 * c ), 0.14 );                 // gentle S-curve
    gl_FragColor.rgb = max( c, 0.0 ); }
#endif
`;

const GradeShader = {
  uniforms: { tDiffuse: { value: null }, uVig: { value: 0.32 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: `uniform sampler2D tDiffuse; uniform float uVig; varying vec2 vUv;
    void main(){ vec4 t = texture2D(tDiffuse, vUv); vec3 c = t.rgb; float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
      c = mix(vec3(l), c, 1.03); c *= mix(vec3(0.97, 0.99, 1.04), vec3(1.04, 1.0, 0.94), smoothstep(0.1, 0.7, l)); c = mix(c, c * c * (3.0 - 2.0 * c), 0.12);
      vec2 d = vUv - 0.5; float v = 1.0 - uVig * smoothstep(0.25, 0.85, dot(d, d) * 2.2); gl_FragColor = vec4(c * v, t.a); }`,
};

/** Build the High-quality composer (lazy import keeps Low/Medium downloads lean) */
export async function makeComposer(renderer, scene, camera) {
  const [{ EffectComposer }, { RenderPass }, { UnrealBloomPass }, { OutputPass }, { ShaderPass }] = await Promise.all([
    import('../vendor/addons/postprocessing/EffectComposer.js?v=8'), import('../vendor/addons/postprocessing/RenderPass.js?v=8'), import('../vendor/addons/postprocessing/UnrealBloomPass.js?v=8'),
    import('../vendor/addons/postprocessing/OutputPass.js?v=8'), import('../vendor/addons/postprocessing/ShaderPass.js?v=8')]);
  const size = renderer.getDrawingBufferSize(new THREE.Vector2());
  const rt = new THREE.WebGLRenderTarget(size.x, size.y, { type: THREE.HalfFloatType, samples: 4 });
  const comp = new EffectComposer(renderer, rt);
  comp.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(size.x / 2, size.y / 2), 0.22, 0.35, 1.6); comp.addPass(bloom);
  comp.addPass(new OutputPass()); comp.addPass(new ShaderPass(GradeShader));
  comp.setSize(innerWidth, innerHeight); comp.bloom = bloom; return comp;
}

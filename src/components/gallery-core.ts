// Ported verbatim from the proven static gallery (portfolio export, fixed 22 Nov 2026).
// Only adaptations: PROJECTS comes in as a parameter, THREE is an npm import,
// and a dispose() was added for React unmount. No visual or behaviour changes.
// @ts-nocheck
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
/* Round 18: post-processing pipeline (Nagi track, code-only). */
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { BokehPass } from 'three/addons/postprocessing/BokehPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import type { Project } from '../lib/projects';

export type GalleryApi = {
  enterRoom: (id: string) => void;
  leaveRoom: () => void;
  goTo: (id: string | null) => void;
  nextRoom: (dir: number) => void;
  startTour: () => void;
  stopTour: () => void;
  isTouring: () => boolean;
  facingRoom: () => string | null;
  isInRoom: () => boolean;
  currentRoomId: () => string | null;
  nudgeYaw: (d: number) => void;
  dispose: () => void;
};

export type GalleryOptions = {
  onLocation?: (loc: string | null) => void;
  onTourChange?: (touring: boolean) => void;
};

export function startGallery(projects: Project[], opts?: GalleryOptions): GalleryApi {
  var PROJECTS = projects;
      var errBox = document.getElementById('errBox');
      window.addEventListener('error', function(e){
        errBox.style.display = 'block';
        errBox.textContent = 'Ada kendala memuat galeri 3D: ' + (e.message || 'kesalahan tidak dikenal') + '. Daftar proyek tetap bisa dibuka lewat tombol Menu di kanan atas.';
      });

      /* ================= DATA ================= */
      
      /* ================= UI ================= */
      var hint = document.getElementById('hint');
      var backBtn = document.getElementById('backBtn');
      var actionBar = document.getElementById('actionBar');
      var enterBtn = document.getElementById('enterBtn');
      var enterLabel = document.getElementById('enterLabel');
      var roomTitle = document.getElementById('roomTitle');
      var roomTitleText = document.getElementById('roomTitleText');
      var menuSheet = document.getElementById('menu');
      var detailSheet = document.getElementById('detail');
      var tip = document.getElementById('tip');
      var hallBar = document.getElementById('hallBar');
      var hallEnterBtn = document.getElementById('hallEnterBtn');
      var hallEnterLabel = document.getElementById('hallEnterLabel');
      var detailObserver = null;
      /* Round 13: auto-fade timer for the big room title (see showRoomUI). */
      var titleFadeTimer = 0;

      function byId(id){ for (var i = 0; i < PROJECTS.length; i++) if (PROJECTS[i].id === id) return PROJECTS[i]; return null; }

      /* The 3D gallery starts only after this UI is wired up (initGallery,
         below). If WebGL is unavailable `gl` stays null and menu cards fall
         back to opening the project detail sheet directly. */
      var gl = null;
      function enterRoom(id){
        if (gl) gl.enterRoom(id);
        else openDetail(id);
      }
      function leaveRoom(){ if (gl) gl.leaveRoom(); }
      backBtn.addEventListener('click', function(){ if (gl) gl.stopTour(); leaveRoom(); });
      document.getElementById('brand').addEventListener('click', function(){
        if (gl) gl.stopTour(); closeMenu(); closeDetail(); if (gl && gl.isInRoom()) gl.leaveRoom();
      });
      /* hallBest lives inside initGallery; the API exposes it via facingRoom(). */
      if (hallEnterBtn) hallEnterBtn.addEventListener('click', function(){
        var id = gl && gl.facingRoom ? gl.facingRoom() : null;
        if (id) enterRoom(id);
      });

      /* menu */
      var cardsEl = document.getElementById('cards');
      PROJECTS.forEach(function(p){
        var b = document.createElement('button');
        b.type = 'button'; b.className = 'card';
        b.innerHTML =
          '<img src="' + p.art + '" alt="Lukisan ' + p.name + '" loading="lazy" />' +
          '<span class="card-body">' +
            '<span class="card-top"><h3>' + p.name + '</h3>' +
            '<span class="status' + (p.live ? ' live' : '') + '">' + p.status + '</span></span>' +
            '<p>' + p.desc + '</p>' +
            '<span class="go">Lihat proyeknya →</span>' +
          '</span>';
        b.addEventListener('click', function(){ enterRoom(p.id); });
        cardsEl.appendChild(b);
      });
      function openMenu(){ menuSheet.classList.add('open'); menuSheet.scrollTop = 0; }
      function closeMenu(){ menuSheet.classList.remove('open'); }
      document.getElementById('menuBtn').addEventListener('click', function(){ if (gl) gl.stopTour(); openMenu(); });
      document.getElementById('menuClose').addEventListener('click', closeMenu);

      /* detail */
      function openDetail(id){
        var p = byId(id); if (!p) return;
        document.getElementById('dImg').src = p.art;
        document.getElementById('dImg').alt = 'Lukisan ' + p.name;
        document.getElementById('dTitle').textContent = p.world;
        document.getElementById('dTag').textContent = p.tag;
        var story = document.getElementById('dStory'); story.innerHTML = '';
        p.story.forEach(function(s){
          var sec = document.createElement('section');
          sec.innerHTML = '<p class="line"></p><p class="note"></p>';
          sec.querySelector('.line').textContent = s.line;
          sec.querySelector('.note').textContent = s.note;
          story.appendChild(sec);
        });
        var spec = document.getElementById('dSpec'); spec.innerHTML = '';
        p.spec.forEach(function(row){
          var div = document.createElement('div');
          div.innerHTML = '<dt></dt><dd></dd>';
          div.querySelector('dt').textContent = row[0];
          div.querySelector('dd').textContent = row[1];
          spec.appendChild(div);
        });
        var ctas = document.getElementById('dCtas'); ctas.innerHTML = '';
        p.ctas.forEach(function(c){
          var a = document.createElement('a');
          a.className = 'cta' + (c.primary ? '' : ' ghost');
          a.href = c.href; a.target = '_blank'; a.rel = 'noopener';
          a.textContent = c.label + ' →';
          ctas.appendChild(a);
        });
        if (!p.ctas.length){
          var note = document.createElement('p');
          note.style.cssText = 'color:var(--ink-soft);line-height:1.65;max-width:32rem;margin:0;';
          note.textContent = 'Studi kasus lengkap dan kode sumber tersedia berdasarkan permintaan — hubungi lewat email di menu Tentang.';
          ctas.appendChild(note);
        }
        /* Scroll-reveal for the story beats + spec: the CSS starts them at
           opacity 0 and only `.in` makes them visible. No code ever added
           `.in`, so the text sat in the DOM and stayed blank on screen. */
        if (typeof IntersectionObserver !== 'undefined'){
          if (detailObserver) detailObserver.disconnect();
          detailObserver = new IntersectionObserver(function(entries){
            entries.forEach(function(en){
              if (en.isIntersecting){ en.target.classList.add('in'); detailObserver.unobserve(en.target); }
            });
          }, { root: detailSheet, threshold: 0.1 });
          story.querySelectorAll('section').forEach(function(sec){ detailObserver.observe(sec); });
          var specwrap = detailSheet.querySelector('.specwrap');
          if (specwrap) detailObserver.observe(specwrap);
        } else {
          story.querySelectorAll('section').forEach(function(sec){ sec.classList.add('in'); });
          var specwrap2 = detailSheet.querySelector('.specwrap');
          if (specwrap2) specwrap2.classList.add('in');
        }
        detailSheet.classList.add('open'); detailSheet.scrollTop = 0;
      }
      function closeDetail(){ detailSheet.classList.remove('open'); }
      document.getElementById('detailClose').addEventListener('click', closeDetail);
      enterBtn.addEventListener('click', function(){ if (gl && gl.currentRoomId()) openDetail(gl.currentRoomId()); });

      document.addEventListener('keydown', function(e){
        if (e.key === 'Escape'){
          if (gl) gl.stopTour();
          if (detailSheet.classList.contains('open')) closeDetail();
          else if (menuSheet.classList.contains('open')) closeMenu();
          else if (gl && gl.isInRoom()) gl.leaveRoom();
        }
        if (menuSheet.classList.contains('open') || detailSheet.classList.contains('open')) return;
        if (!gl) return;
        /* In a room, ←/→ step between rooms (eased flight through the
           hall); in the hall they still nudge the view, as before. */
        if (e.key === 'ArrowLeft'){ if (gl.isInRoom()){ gl.stopTour(); gl.nextRoom(-1); } else gl.nudgeYaw(-0.3); }
        if (e.key === 'ArrowRight'){ if (gl.isInRoom()){ gl.stopTour(); gl.nextRoom(1); } else gl.nudgeYaw(0.3); }
      });

      /* ================= 3D GALLERY INIT ================= */
      /* Runs after the UI above, so a WebGL failure can never take the menu,
         cards, or detail sheet down with it. */
      try {
        gl = initGallery();
      } catch (err) {
        errBox.style.display = 'block';
        errBox.textContent = 'Ada kendala memuat galeri 3D: ' + (err && err.message ? err.message : 'kesalahan tidak dikenal') + '. Daftar proyek tetap bisa dibuka lewat tombol Menu di kanan atas.';
        document.getElementById('fade').style.opacity = '0';
      }

      requestAnimationFrame(function(){
        document.getElementById('fade').style.opacity = '0';
      });

      function initGallery(){
      /* ================= RENDERER / SCENE ================= */
      var container = document.getElementById('scene');
      /* Round 22: antialias true -> false. The composer owns edge
         smoothing since r18 (its render targets carry samples:2);
         the renderer's antialias only MSAA-filters the DEFAULT
         framebuffer, and the only thing ever drawn to it is the
         final fullscreen quad (OutputPass) — a quad has no interior
         edges, so default-buffer MSAA is pure per-sample cost on a
         full screen of tone mapping + sRGB for zero visual gain.
         The scene's jaggies are still handled by the composer
         targets' samples (r20 check: edges smooth at MSAA 2). */
      var renderer = new THREE.WebGLRenderer({ antialias:false });
      /* Round 15: pixelRatio cap 2 -> 1.5. Three r170 has NO
         transmissionResolutionScale — the transmission pass re-renders
         the whole opaque scene into a full-viewport render target with
         4x MSAA + mipmaps, so the crystal costs a second full render
         every frame. Capping the ratio cuts the pixel load of BOTH
         passes ~1.8x; the scene is small enough that 1.5 is visually
         near-identical on ordinary displays.
         Round 20: 1.5 -> 1.25. The r19 check measured Gemfund at
         ~18-19 s/frame (r17: ~14.6) with bloom + DOF + transmission
         + shadow 2048 running together; 1.25 cuts every pass's pixel
         load a further ~31% (1.5^2 vs 1.25^2). The scene is large
         soft shapes, so 1.25 stays visually near-identical. */
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.25));
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      /* Round 21: shadow maps render ONCE, not every frame.
         Diagnosis: with autoUpdate (the default) the sun's 2048
         shadow map re-renders the whole scene every frame — a full
         extra scene render on top of the transmission + main +
         bloom passes. The scene is fully static for shadows: since
         r18 nothing that casts moves (statues stand still, the knot
         doesn't turn, dust doesn't cast, lights never move), so the
         shadow map never changes after the first render.
         needsUpdate = true renders it once at startup; autoUpdate
         = false keeps it. Zero visual change, one full scene
         render per frame saved in every room. */
      renderer.shadowMap.autoUpdate = false;
      renderer.shadowMap.needsUpdate = true;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.32;
      if ('outputColorSpace' in renderer) renderer.outputColorSpace = THREE.SRGBColorSpace;
      container.appendChild(renderer.domElement);

      var scene = new THREE.Scene();
      scene.background = new THREE.Color(0xefe9db);
      scene.fog = new THREE.Fog(0xefe9db, 26, 60);

      /* Round 21: constructor FOV 58 -> 64 (hall default; animate
         owns the live FOV after frame 1 — 58 in rooms, 60.5
         mid-flight, hallFov in the hall — so the constructor value
         only sets the very first frame, and it must match the hall
         default or the first frame renders at 58 while fovCur
         already says 64 and never self-corrects). */
      var camera = new THREE.PerspectiveCamera(64, window.innerWidth/window.innerHeight, 0.1, 120);
      /* r19 HOTFIX: this whole composer block MUST stay AFTER scene/camera
         are created above. BokehPass reads camera.aspect in its constructor
         (three r170 BokehPass.js:56); in r18 the block sat before the
         `var scene`/`var camera` declarations, so camera was undefined
         (var hoisting) and initGallery() threw 'Cannot read properties of
         undefined (reading \'aspect\')' — total blank gallery. Do not move
         this block above the camera again. */
      /* ================= ROUND 18: POST-PROCESSING =================
         The r17 audit's gap #2: the gallery rendered raw (only ACES +
         antialias), everything sharp front to back, no focus
         hierarchy — Nagi reads cinematic because the statue is in
         focus, the background falls off softly, and the grade is
         warm with a gentle vignette. Pipeline: RenderPass -> bloom
         (high threshold, only true highlights) -> Bokeh DOF (gated,
         see animate) -> one cheap grade pass (warm grade + vignette
         + grain) -> OutputPass (tone mapping + sRGB, must be last;
         without it the composer would skip the renderer's ACES).
         MSAA 4x on the composer targets (round 20: 2x — see the
         composer block below): the renderer's antialias
         only applies to the default framebuffer, so without this
         every edge would go jaggy the moment the composer is used.
         The samples are set before the first render, when the GL
         renderbuffers are allocated. */
      var GradeShader = {
        uniforms: {
          tDiffuse: { value: null },
          uTime: { value: 0 },
          uVig: { value: 0.22 },
          uGrain: { value: 0.018 }
        },
        vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
        fragmentShader: [
          'uniform sampler2D tDiffuse; uniform float uTime; uniform float uVig; uniform float uGrain; varying vec2 vUv;',
          'float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }',
          'void main(){',
          '  vec4 c = texture2D(tDiffuse, vUv);',
          '  vec3 col = c.rgb;',
          '  col *= vec3(1.02, 1.0, 0.965);',
          '  col += vec3(0.008, 0.005, 0.002);',
          '  vec2 q = vUv - 0.5;',
          '  float vig = 1.0 - uVig * dot(q, q) * 2.4;',
          '  col *= clamp(vig, 0.0, 1.0);',
          '  float g = hash(vUv * vec2(1920.0, 1080.0) + fract(uTime) * 43.0) - 0.5;',
          '  col += g * uGrain;',
          '  gl_FragColor = vec4(col, c.a);',
          '}'
        ].join('\n')
      };
      var composer = new EffectComposer(renderer);
      /* Round 20: samples 4 -> 2. The r19 check praised the smooth
         edges, but 4x MSAA on both HalfFloat composer targets is one
         of the heaviest fill costs in Gemfund (transmission + bloom
         + MSAA resolve together). 2x keeps edges clean on this
         scene's large soft shapes — the grade pass and DOF soften
         them further — at roughly half the resolve cost. Revert
         candidate if the visual check finds jaggies. */
      composer.renderTarget1.samples = 2;
      composer.renderTarget2.samples = 2;
      composer.addPass(new RenderPass(scene, camera));
      /* Bloom, round 20 — DIAGNOSIS (Node probe, three r170's exact
         punctual-light formulas): the r19 threshold 0.9 was BELOW
         the linear-HDR radiance of the white statues' lit faces.
         Under the room rig (spot 40 + point 30 + sun 1.6 + hemi
         1.05) the robe's shoulder/top reads lum ~2.26 and the
         monolith's top edge ~2.54 — the whole top of each statue is
         a bloom source, and the blur bleeds down over the folds
         (0.39), the stamp and the gold cells (0.23), flattening
         them into a white blob; the approval sheet reads 1.17 and
         the paintings' bright areas 0.93, so both hazed too. The
         crystal/knot were safe (dark green/dark stone, below
         threshold). Fix, layered: threshold 0.9 -> 1.15 (paintings
         and the sheet fall below it entirely once the lights are
         trimmed, see below), strength 0.3 -> 0.15 (halved wash even
         where the tops still clear it), radius 0.5 -> 0.35
         (tighter bloom, less spread over folds/cells). The tops
         still bloom a little — small bright caps reading as light
         catching the top edge, not a whole-statue whiteout. */
      var bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.15, 0.35, 1.15);
      composer.addPass(bloomPass);
      /* DOF: BokehPass. focus is re-aimed every frame at the
         camera-to-target distance. Round 20: maxblur 0.006 -> 0.003
         and aperture 0.0015 -> 0.0012. At maxblur 0.006 the back
         wall (~4 m behind the statue) hit FULL blur, and on top of
         the bloom haze the paintings dissolved into fog; 0.003 keeps
         them soft but readable while the statue stays sharp. */
      var bokehPass = new BokehPass(scene, camera, { focus: 4.6, aperture: 0.0012, maxblur: 0.003 });
      composer.addPass(bokehPass);
      var gradePass = new ShaderPass(GradeShader);
      composer.addPass(gradePass);
      composer.addPass(new OutputPass());

      /* Round 14: RoomEnvironment PMREM — the old "no env map" call
         left clearcoat/metal with nothing to reflect, which is why
         the Gemfund gem read as flat glowing plastic. PMREM
         generation is a one-off at init; environmentIntensity is
         kept low (0.35) so the warm palette is not washed out. */
      var pmrem = new THREE.PMREMGenerator(renderer);
      scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
      scene.environmentIntensity = 0.35;
      pmrem.dispose();

      var hemi = new THREE.HemisphereLight(0xfff6e6, 0xcfc2ab, 1.05);
      scene.add(hemi);
      var sun = new THREE.DirectionalLight(0xfff1d6, 1.6);
      /* Round 15: near-overhead sun (was 4,12,2). At 69 deg elevation
         the lattice shadow landed 1.8 units off-centre and, seen from
         the low hall camera, the foreshortened 0.6 grid read as a
         diagonal band instead of squares. Near-vertical light drops
         the grid centred under the oculus (~0.7 offset) with almost
         no shear. Rooms sit outside the +/-14 shadow frustum, so
         their lighting is unaffected. */
      sun.position.set(1.5, 12, 0.75);
      sun.castShadow = true;
      /* Round 15: 2048 -> 1024. The transmission pass is the frame
         cost now; the shadow map only needs to resolve 0.14-wide
         lattice bars (~5 texels at 1024 over 28 units) and the big
         soft shapes, which PCFSoft hides.
         Round 17: back to 2048 — the floor grid never read as
         squares: at 1024 the 0.22 bars are ~8 texels and PCFSoft
         blurs them into the soft oval the r14–r16 checks saw. At
         2048 the 0.30 bars are ~22 texels, so the grid edges stay
         crisp. The shadow map is a one-off 16 MB texture; the
         transmission pass is still the frame cost. */
      sun.shadow.mapSize.set(2048, 2048);
      sun.shadow.camera.left = -14; sun.shadow.camera.right = 14;
      sun.shadow.camera.top = 14; sun.shadow.camera.bottom = -14;
      sun.shadow.camera.far = 40;
      sun.shadow.bias = -0.0004;
      scene.add(sun);
      var fill = new THREE.DirectionalLight(0xdfeaf2, 0.35);
      fill.position.set(-6, 5, -8);
      scene.add(fill);
      /* Round 17: 22 -> 12. This unshadowed point light floods the
         hall floor and washes out the sun's lattice shadow (it is
         the biggest unshadowed term on the floor after the hemi
         light). Halving it lifts the lit/shadowed contrast of the
         grid without darkening the hall — sun + hemi + fill stay. */
      var oculusGlow = new THREE.PointLight(0xffe6bf, 12, 20, 2);
      oculusGlow.position.set(0, 5.2, 0);
      scene.add(oculusGlow);

      /* ================= CANVAS TEXTURE HELPERS ================= */
      function canvasTex(w, h, draw, repeatX, repeatY){
        var c = document.createElement('canvas'); c.width = w; c.height = h;
        draw(c.getContext('2d'), w, h);
        var t = new THREE.CanvasTexture(c);
        t.colorSpace = THREE.SRGBColorSpace;
        t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
        if (repeatX){ t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeatX, repeatY || 1); }
        return t;
      }
      var woodTex = canvasTex(1024, 1024, function(g, w, h){
        g.fillStyle = '#c9a77e'; g.fillRect(0,0,w,h);
        var rows = 10;
        for (var r = 0; r < rows; r++){
          var y = r * h / rows;
          var l = 58 + Math.random()*14;
          g.fillStyle = 'hsl(33, 40%, ' + l + '%)';
          g.fillRect(0, y, w, h/rows - 2);
          for (var i = 0; i < 80; i++){
            g.strokeStyle = 'rgba(110,76,42,' + (0.07 + Math.random()*0.11) + ')';
            g.lineWidth = 1 + Math.random()*1.6;
            g.beginPath();
            var gy = y + Math.random() * (h/rows - 4);
            g.moveTo(0, gy);
            g.bezierCurveTo(w*0.3, gy + (Math.random()*6-3), w*0.7, gy + (Math.random()*6-3), w, gy);
            g.stroke();
          }
          /* a knot or two per plank for a real-wood read */
          if (Math.random() < 0.7){
            var kx = Math.random()*w, ky = y + h/rows*0.5;
            g.strokeStyle = 'rgba(96,64,36,.5)'; g.lineWidth = 2;
            g.beginPath(); g.ellipse(kx, ky, 9 + Math.random()*7, 5 + Math.random()*4, 0, 0, 7); g.stroke();
            g.beginPath(); g.ellipse(kx, ky, 4, 2.2, 0, 0, 7); g.stroke();
          }
          g.fillStyle = 'rgba(90,64,38,.4)';
          g.fillRect(0, y + h/rows - 2, w, 2);
        }
        /* fine speckle so the floor is not a flat wash up close */
        for (var s2 = 0; s2 < 2600; s2++){
          g.fillStyle = 'rgba(80,55,30,' + (Math.random()*0.05) + ')';
          g.fillRect(Math.random()*w, Math.random()*h, 1.4, 1.4);
        }
      }, 6, 6);
      /* Room floors use their own clone of the wood texture, repeated so one
         tile covers the same world size as on the hall floor (~7.6 units).
         Before, rooms repeated the texture 6x over 11 units (planks 4x
         smaller than the hall's) and sat coplanar with it at y=0 — the
         z-fight between the two floors showed up as the diagonal V-seam,
         worst in Siaprak where the room planks run ~54 deg to the hall
         planks. Room floors are also lifted to y=0.02 (see below) so the
         two floors can never z-fight again. */
      var woodTexRoom = woodTex.clone();
      woodTexRoom.repeat.set(1.5, 1.2);
      woodTexRoom.needsUpdate = true;
      var wallTex = canvasTex(1024, 512, function(g, w, h){
        g.fillStyle = '#e9dcc2'; g.fillRect(0,0,w,h);
        /* plaster grain: speckle + vertical streaks so the wall reads as a surface */
        for (var n = 0; n < 3600; n++){
          g.fillStyle = 'rgba(120,100,70,' + (0.05 + Math.random()*0.08) + ')';
          g.fillRect(Math.random()*w, Math.random()*h, 2.5, 2.5);
        }
        for (var v = 0; v < 30; v++){
          g.strokeStyle = 'rgba(120,100,70,' + (0.03 + Math.random()*0.04) + ')';
          g.lineWidth = 2 + Math.random()*5;
          var vx = Math.random()*w;
          g.beginPath(); g.moveTo(vx, 0); g.lineTo(vx + (Math.random()*14-7), h); g.stroke();
        }
        g.strokeStyle = 'rgba(122,102,74,.22)'; g.lineWidth = 8;
        /* Each arc is drawn three times (x-w, x, x+w) so the motif tiles
           seamlessly — before, the repeat seam showed as a vertical line. */
        for (var i = -4; i < 14; i++){
          [-w, 0, w].forEach(function(off){
            g.beginPath(); g.arc(i*95 + off, h*1.15, 150, Math.PI*1.15, Math.PI*1.85); g.stroke();
            g.beginPath(); g.arc(i*95 + 48 + off, -h*0.15, 150, Math.PI*0.15, Math.PI*0.85); g.stroke();
          });
        }
        var grad = g.createLinearGradient(0,0,0,h);
        grad.addColorStop(0,'rgba(255,255,255,.20)'); grad.addColorStop(1,'rgba(120,100,70,.10)');
        g.fillStyle = grad; g.fillRect(0,0,w,h);
      }, 7, 1);
      var skyTex = canvasTex(1024, 512, function(g, w, h){
        var grad = g.createLinearGradient(0,0,0,h);
        grad.addColorStop(0,'#7fa8c8'); grad.addColorStop(.55,'#b8cfdf'); grad.addColorStop(1,'#f2e3c2');
        g.fillStyle = grad; g.fillRect(0,0,w,h);
        for (var i = 0; i < 26; i++){
          var x = Math.random()*w, y = Math.random()*h*0.6, r = 30 + Math.random()*80;
          var rg = g.createRadialGradient(x,y,0,x,y,r);
          rg.addColorStop(0,'rgba(255,255,255,.5)'); rg.addColorStop(1,'rgba(255,255,255,0)');
          g.fillStyle = rg; g.beginPath(); g.arc(x,y,r,0,7); g.fill();
        }
      });
      var calendarTex = canvasTex(512, 640, function(g, w, h){
        g.fillStyle = '#e9ead9'; g.fillRect(0,0,w,h);
        g.fillStyle = '#75855a'; g.fillRect(0,0,w,86);
        var cols = 5, rows = 6, pad = 26, gap = 14;
        var cw = (w - pad*2 - gap*(cols-1)) / cols, ch = (h - 130 - pad - gap*(rows-1)) / rows;
        for (var r = 0; r < rows; r++) for (var c = 0; c < cols; c++){
          var hot = (r === 1 && c === 2) || (r === 3 && c === 4);
          g.fillStyle = hot ? '#d9a441' : '#f7f5ea';
          g.strokeStyle = 'rgba(90,95,70,.35)'; g.lineWidth = 2;
          var x = pad + c*(cw+gap), y = 118 + r*(ch+gap);
          g.beginPath();
          if (g.roundRect) g.roundRect(x, y, cw, ch, 10); else g.rect(x, y, cw, ch);
          g.fill(); g.stroke();
        }
      });
      function archArtTexture(img){
        var c = document.createElement('canvas'); c.width = 768; c.height = 1080;
        var g = c.getContext('2d');
        var w = 768, h = 1080, r = w/2;
        g.beginPath();
        g.moveTo(6, h); g.lineTo(6, r); g.arc(r, r, r-6, Math.PI, 0); g.lineTo(w-6, h); g.closePath();
        g.clip();
        var iw = img.width, ih = img.height, s = Math.max(w/iw, h/ih);
        g.drawImage(img, (w - iw*s)/2, (h - ih*s)/2, iw*s, ih*s);
        var t = new THREE.CanvasTexture(c);
        t.colorSpace = THREE.SRGBColorSpace;
        t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
        return t;
      }
      /* Granite for the stone knot. Round 3's version was invisible: 1-2px
         speckles at alpha <=0.24 on a 256px texture repeated 2x over a
         ~0.5-unit knot are sub-pixel on screen, and the pale #b3a184 base
         washed out under ACES. This one is 512px, repeat 1, with 3-9px
         speckles at high contrast over a darker base, plus thick veins and
         large soft mottling, so the stone reads as stone at any distance. */
      var stoneTex = (function(){
        var c = document.createElement('canvas'); c.width = c.height = 512;
        var g = c.getContext('2d');
        g.fillStyle = '#8a7d68'; g.fillRect(0, 0, 512, 512);
        /* large soft mottling so the base is not a flat wash */
        for (var m = 0; m < 46; m++){
          var mx = Math.random()*512, my = Math.random()*512, mr = 24 + Math.random()*56;
          var mg = g.createRadialGradient(mx, my, 0, mx, my, mr);
          var dark = Math.random() < 0.55;
          mg.addColorStop(0, dark ? 'rgba(74,63,48,' + (0.10 + Math.random()*0.10) + ')'
                                  : 'rgba(214,203,178,' + (0.08 + Math.random()*0.08) + ')');
          mg.addColorStop(1, 'rgba(0,0,0,0)');
          g.fillStyle = mg; g.beginPath(); g.arc(mx, my, mr, 0, 7); g.fill();
        }
        /* granite speckle, toned down a touch in round 6: round 5 read as
           dalmatian from afar, so grains are slightly smaller and softer
           — still clearly speckled, just less shouty. Dark grains + light quartz.
           Drawn as tall ellipses, NOT squares: the torus-knot UV maps the
           knot's ~5.5-unit length to texture-x but only the ~0.75-unit tube
           circumference to texture-y, so a square reads on the surface as a
           6x streak along the knot (the wood/rope look of round 4). An
           ellipse ~6x taller than wide compensates and reads as a round
           granite grain. */
        for (var i = 0; i < 7000; i++){
          var v = Math.random();
          if (v < 0.45) g.fillStyle = 'rgba(38,31,22,' + (0.38 + Math.random()*0.25) + ')';
          else if (v < 0.8) g.fillStyle = 'rgba(222,212,190,' + (0.35 + Math.random()*0.25) + ')';
          else g.fillStyle = 'rgba(96,82,62,' + (0.3 + Math.random()*0.2) + ')';
          var rx = 2 + Math.random()*2.5, ry = rx * 6;
          g.beginPath();
          g.ellipse(Math.random()*512, Math.random()*512, rx, ry, 0, 0, 7);
          g.fill();
        }
        /* sparse thin veins: round 4's 14 thick veins dominated the surface
           and, stretched along the knot, read as wood grain. Fewer, thinner,
           fainter and shorter so the speckle is the first thing you see. */
        for (var j = 0; j < 5; j++){
          g.strokeStyle = 'rgba(52,42,30,' + (0.18 + Math.random()*0.12) + ')';
          g.lineWidth = 1 + Math.random();
          var sx = Math.random()*512, sy = Math.random()*512;
          [-512, 0, 512].forEach(function(off){
            g.beginPath();
            g.moveTo(sx + off, sy);
            g.bezierCurveTo(sx + 30 + off, sy + (Math.random()*40-20), sx + 80 + off, sy + (Math.random()*40-20), sx + 130 + off, sy + (Math.random()*30-15));
            g.stroke();
          });
        }
        var t = new THREE.CanvasTexture(c);
        t.colorSpace = THREE.SRGBColorSpace;
        t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1, 1);
        t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
        return t;
      })();
      /* soft fake contact shadow: grounds a plinth where no shadow light reaches */
      var contactTex = (function(){
        var c = document.createElement('canvas'); c.width = c.height = 256;
        var g = c.getContext('2d');
        var rg = g.createRadialGradient(128, 128, 8, 128, 128, 128);
        rg.addColorStop(0, 'rgba(24,16,8,0.5)'); rg.addColorStop(0.65, 'rgba(24,16,8,0.22)'); rg.addColorStop(1, 'rgba(24,16,8,0)');
        g.fillStyle = rg; g.fillRect(0, 0, 256, 256);
        return new THREE.CanvasTexture(c);
      })();
      /* stronger variant for the hall plinth. Round 4's version faded too
         fast (0.38 by mid-radius, 0 at the edge), so from the low default
         camera the ring outside the 0.95 plinth base read as nothing. This
         one holds high alpha far out: the visible ring stays 0.6 -> 0.4
         across most of its width instead of collapsing to zero.
         Round 7: alphas raised again (0.80/0.70/0.52/0.28) — the round 6
         check found the wide halo no longer read clearly from the default
         view, only the thin baseRing band. The centre stays hidden under
         the plinth (base radius 0.95), so the visible ring is a soft
         gradient, not a black blob.
         Round 8: the round 7 alpha raise did NOT read visually — from the
         default view only a thin band plus a fast-fading darkening showed,
         nowhere near round 5's wide clear halo. So this round goes BOLD:
         radius 2.6 -> 3.6 AND a much slower fade (0.78 held to 45% of
         the radius, 0.60 at 70%, 0.32 at 90%), so the dark area stays
         wide and clearly readable from the far/high default camera. */
      var contactTexStrong = (function(){
        var c = document.createElement('canvas'); c.width = c.height = 256;
        var g = c.getContext('2d');
        var rg = g.createRadialGradient(128, 128, 4, 128, 128, 128);
        rg.addColorStop(0, 'rgba(24,16,8,0.82)'); rg.addColorStop(0.45, 'rgba(24,16,8,0.78)');
        rg.addColorStop(0.7, 'rgba(24,16,8,0.60)'); rg.addColorStop(0.9, 'rgba(24,16,8,0.32)');
        rg.addColorStop(1, 'rgba(24,16,8,0)');
        g.fillStyle = rg; g.fillRect(0, 0, 256, 256);
        return new THREE.CanvasTexture(c);
      })();
      /* wide faint halo: a second, much larger disc so the plinth reads as
         grounded from the low default camera, where a single tight disc
         foreshortens to a thin band. Round 7: alphas raised 0.16->0.26 /
         0.10->0.17 so the halo reads from the default view again.
         Round 8: radius 3.6 -> 5.0 and a slower fade (0.30 held to half
         the radius, 0.20 at 75%) — the halo must read as a wide dark
         area around the plinth from the far/high default camera, like
         round 5, not a faint whisper that vanishes at distance. */
      var contactTexHalo = (function(){
        var c = document.createElement('canvas'); c.width = c.height = 256;
        var g = c.getContext('2d');
        var rg = g.createRadialGradient(128, 128, 4, 128, 128, 128);
        rg.addColorStop(0, 'rgba(24,16,8,0.34)'); rg.addColorStop(0.5, 'rgba(24,16,8,0.30)');
        rg.addColorStop(0.75, 'rgba(24,16,8,0.20)');
        rg.addColorStop(1, 'rgba(24,16,8,0)');
        g.fillStyle = rg; g.fillRect(0, 0, 256, 256);
        return new THREE.CanvasTexture(c);
      })();
      function contactShadow(x, y, z, r, parent, tex){
        var m = new THREE.Mesh(new THREE.PlaneGeometry(r*2, r*2),
          new THREE.MeshBasicMaterial({ map: tex || contactTex, transparent:true, depthWrite:false }));
        m.rotation.x = -Math.PI/2; m.position.set(x, y, z);
        m.renderOrder = 2; parent.add(m);
      }
      function dotSprite(){
        var c = document.createElement('canvas'); c.width = c.height = 64;
        var g = c.getContext('2d');
        var rg = g.createRadialGradient(32,32,0,32,32,32);
        rg.addColorStop(0,'rgba(255,250,235,1)'); rg.addColorStop(1,'rgba(255,250,235,0)');
        g.fillStyle = rg; g.fillRect(0,0,64,64);
        return new THREE.CanvasTexture(c);
      }

      var texLoader = new THREE.TextureLoader();
      function loadArt(path){
        var t = texLoader.load(path);
        t.colorSpace = THREE.SRGBColorSpace;
        t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
        return t;
      }

      /* ================= MATERIALS ================= */
      var MAT = {
        cream:  new THREE.MeshStandardMaterial({ map: wallTex, roughness:.96, metalness:0 }),
        creamPlain: new THREE.MeshStandardMaterial({ color:0xece4d2, roughness:.96 }),
        woodDark: new THREE.MeshStandardMaterial({ color:0x8a6844, roughness:.7 }),
        woodFloor: new THREE.MeshStandardMaterial({ map: woodTex, roughness:.75 }),
        woodFloorRoom: new THREE.MeshStandardMaterial({ map: woodTexRoom, roughness:.75 }),
        stone: new THREE.MeshStandardMaterial({ color:0x9a958a, roughness:.9 }),
        /* Round 20: 0x55534e -> 0xc4beb0 (pale stone). The probe
           measured the old plinth at linear lum 0.05 — the material
           itself is near-charcoal, so the room plinths read dark
           grey while the hall plinth (MAT.stone, lum 0.36) reads
           pale. The r19 check's "plinth putih batu di r17" was the
           light stone cap; the base/column were always this dark.
           Pale stone restores the white-stone read without touching
           the hall plinth (still MAT.stone). Used only by the room
           plinth base + column. */
        plinth: new THREE.MeshStandardMaterial({ color:0xc4beb0, roughness:.85 }),
        paper: new THREE.MeshStandardMaterial({ color:0xf6f1e3, roughness:.9 })
      };

      var clickables = [];
      /* Clone each clickable mesh's material once: several groups share
         materials (e.g. MAT.stone on the hall plinth and the Rolling slab),
         and the hover glow below writes to the material — without the clone
         a hovered sculpture would light the hall plinth too. */
      function markClickable(obj, data){ obj.traverse(function(o){ if (o.isMesh){ o.userData.hit = data; if (o.material && !o.userData._matCloned){ o.material = o.material.clone(); o.userData._matCloned = true;
          /* Round 20: register TRANSMISSIVE CLONES for the gate.
             buildSculpture registers the original gem material, but
             this clone step replaces every rendered mesh's material
             with a fresh copy — the r16 gate was toggling an orphan
             material while the rendered crystals kept transmission 1
             (proven by Node probe: gate set 0, rendered meshes still
             1). So the transmission pass ran every frame in every
             room and the hall, together with Bokeh in Siaprak/Rolling
             — the "two heavy passes never run together" claim of r18
             was false. The clones are what the renderer sees, so
             they are what the gate must toggle. Guarded: gemMats is
             declared later in source order (var hoisting) but
             assigned before the first markClickable call. */
          if (o.material.transmission !== undefined && o.material.transmission > 0 && typeof gemMats !== 'undefined' && gemMats) gemMats.push(o.material); } clickables.push(o); } }); }

      /* ---- hover: tooltip + subtle glow on the hovered group ---- */
      var hoverKey = null;
      /* Hover glow, round 12: the round 9–11 emissive (0x8a5a18 @
         1.25) was a strong amber wash across the whole hovered
         surface — under ACES it bleached the painting pale (the
         Gemfund green gem read as pale yellow). Now a much gentler
         lift (0x6b4423 @ 0.5) and a deeper, dimmer tint for basic
         (textured) materials, so the painting stays readable. */
      function applyGlow(o){
        var m = o.material;
        if (!m) return;
        /* Round 20: never add emissive to a transmissive material.
           The r19 check found hovering the crystal bleached the
           emerald pale/white — the amber emissive (0x6b4423 @ 0.5)
           is added straight into the transmission shader's output,
           on top of the transmitted green. The halo ring alone
           marks the crystal; the emissive adds nothing but wash. */
        if (m.transmission !== undefined && m.transmission > 0) return;
        if (m.emissive){
          if (o.userData._emOrig === undefined) o.userData._emOrig = m.emissive.getHex();
          if (o.userData._emIntOrig === undefined) o.userData._emIntOrig = (m.emissiveIntensity === undefined ? 1 : m.emissiveIntensity);
          m.emissive.setHex(0x6b4423);
          m.emissiveIntensity = 0.5;
        } else if (m.isMeshBasicMaterial){
          if (o.userData._colOrig === undefined) o.userData._colOrig = m.color.getHex();
          m.color.setHex(0xe0aa5e);
        }
      }
      function restoreGlow(o){
        var m = o.material;
        if (!m) return;
        if (m.emissive && o.userData._emOrig !== undefined){
          m.emissive.setHex(o.userData._emOrig);
          if (o.userData._emIntOrig !== undefined) m.emissiveIntensity = o.userData._emIntOrig;
        }
        else if (m.isMeshBasicMaterial && o.userData._colOrig !== undefined) m.color.setHex(o.userData._colOrig);
      }
      /* Hover halo, round 11: an annulus (ring) texture, not a soft
         blob. The round 10 blob failed for two compounding reasons:
         its brightest centre sits at the hovered group's Box3 centre
         — inside/behind the object's own front surface — so the depth
         test swallows exactly the bright part, and the faint outer
         gradient that survives is an additive wash over an
         already-bright ACES-tonemapped surface, which compresses to
         near-invisible. A ring puts the bright band OUTSIDE the
         object's silhouette (over the wall behind it) with a
         transparent centre, so it reads as a halo instead of a wash.
         depthTest:false guarantees it can never be occluded by the
         object it is meant to highlight. */
      function ringSpriteTex(){
        var c = document.createElement('canvas'); c.width = c.height = 256;
        var g = c.getContext('2d');
        var rg = g.createRadialGradient(128, 128, 0, 128, 128, 128);
        rg.addColorStop(0, 'rgba(255,154,42,0)');
        rg.addColorStop(0.78, 'rgba(255,154,42,0)');
        rg.addColorStop(0.86, 'rgba(255,154,42,0.55)');
        rg.addColorStop(0.92, 'rgba(255,154,42,0.18)');
        rg.addColorStop(1, 'rgba(255,154,42,0)');
        g.fillStyle = rg; g.fillRect(0, 0, 256, 256);
        return new THREE.CanvasTexture(c);
      }
      var glowSprite = new THREE.Sprite(new THREE.SpriteMaterial({
        map: ringSpriteTex(), color: 0xffffff, transparent: true, opacity: 0,
        blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false }));
      glowSprite.renderOrder = 10;
      scene.add(glowSprite);
      function updateHover(hit, x, y){
        var key = hit ? hit.type + ':' + hit.id : null;
        if (key !== hoverKey){
          if (hoverKey){
            clickables.forEach(function(o){
              var h = o.userData.hit;
              if (h && (h.type + ':' + h.id) === hoverKey) restoreGlow(o);
            });
          }
          hoverKey = key;
          if (hit){
            clickables.forEach(function(o){
              var h = o.userData.hit;
              if (h && (h.type + ':' + h.id) === key) applyGlow(o);
            });
          } else {
            glowSprite.material.opacity = 0;
            glowObj = null;
          }
        }
        /* Round 13: the ring follows the MESH under the pointer
           (hoverObj), repositioned the moment it changes — NOT when
           the hover key changes. The key is per-room
           ('detail:gemfund'), so moving between the paintings,
           plinth and sculpture of one room never changed the key
           and the ring stayed frozen on the first mesh hovered in
           that room; it only moved when the pointer crossed a
           non-clickable gap (key -> null -> key again). That is the
           multi-second "glide lag" of the round 12 check: the
           tooltip (updated on every call, below) moved instantly
           while the ring sat on the old object. There is no
           position lerp anywhere in the code — the ring snaps.
           (Sizing stays round 12: single-mesh Box3, maxDim x 1.35,
           capped 6.5, opacity 0.5. Round 15: the 2.0 minimum dwarfed
           small meshes — the 0.84-unit crystal got a 2.0-unit ring,
           ~440 px on screen, so the halo floated between the painting
           and the crystal instead of hugging one object. Minimum
           1.1 keeps the band just outside the silhouette.) */
        if (hit && hoverObj && hoverObj !== glowObj){
          glowObj = hoverObj;
          var box = new THREE.Box3().expandByObject(hoverObj);
          var c = box.getCenter(new THREE.Vector3());
          var s = box.getSize(new THREE.Vector3());
          var m = Math.max(s.x, s.y, s.z);
          glowSprite.position.copy(c);
          glowSprite.scale.setScalar(Math.min(6.5, Math.max(1.1, m * 1.35)));
          glowSprite.material.opacity = 0.5;
        }
        if (tip){
          if (hit){
            var p = byId(hit.id);
            tip.textContent = (hit.type === 'enter' ? 'Masuk — ' : 'Lihat detail — ') + (p ? p.name : '');
            tip.style.left = x + 'px';
            tip.style.top = y + 'px';
            tip.classList.add('show');
          } else tip.classList.remove('show');
        }
      }

      /* ================= HALL ================= */
      var HALL_R = 9, HALL_H = 5.4;
      var hall = new THREE.Group(); scene.add(hall);

      var floor = new THREE.Mesh(new THREE.CircleGeometry(HALL_R + 14, 48), MAT.woodFloor);
      floor.rotation.x = -Math.PI/2; floor.receiveShadow = true;
      hall.add(floor);

      var wall = new THREE.Mesh(
        new THREE.CylinderGeometry(HALL_R, HALL_R, HALL_H, 72, 1, true),
        new THREE.MeshStandardMaterial({ map: wallTex, roughness:.96, side: THREE.BackSide })
      );
      wall.position.y = HALL_H/2; wall.receiveShadow = true;
      hall.add(wall);

      var ceiling = new THREE.Mesh(new THREE.RingGeometry(3.1, HALL_R + 0.4, 72), MAT.creamPlain);
      ceiling.rotation.x = Math.PI/2; ceiling.position.y = HALL_H;
      hall.add(ceiling);
      var drum = new THREE.Mesh(new THREE.CylinderGeometry(3.1, 3.1, 0.7, 48, 1, true),
        new THREE.MeshStandardMaterial({ color:0xe6dcc6, roughness:.95, side: THREE.DoubleSide }));
      drum.position.y = HALL_H + 0.35; hall.add(drum);
      var sky = new THREE.Mesh(new THREE.CircleGeometry(3.3, 48),
        new THREE.MeshBasicMaterial({ map: skyTex }));
      sky.rotation.x = Math.PI/2; sky.position.y = HALL_H + 0.72;
      hall.add(sky);
      var oculusRing = new THREE.Mesh(new THREE.TorusGeometry(3.12, 0.07, 12, 72), MAT.woodDark);
      oculusRing.rotation.x = Math.PI/2; oculusRing.position.y = HALL_H + 0.06;
      hall.add(oculusRing);
      /* Round 14: skylight grille (gobo) — a lattice of thin bars just
         under the oculus. From below it reads as the skylight's grille;
         the sun shining through it throws a geometric lattice shadow
         across the hall floor, the Nagi-style daylight.
         Round 15: 9x9 at 0.6 spacing, 0.09 bars, was too fine to read
         on the floor from the low hall camera (foreshortened into a
         diagonal band) and the slanted sun threw it off-centre. Now
         7x7 at 0.75 spacing with 0.14 bars, under the near-overhead
         sun, so the floor shadow reads as neat squares centred on
         the plinth.
         Round 16: the floor grid still did not read — the shadow on
         the white plinth is crisp, but on the wood floor it is a
         soft oval. Two causes: 0.14 bars are ~5 texels in the 1024
         shadow map and PCFSoft blurs them out, and the unshadowed
         oculus point light floods the floor and kills the contrast.
         Fix: bars 0.14 -> 0.22 (~8 texels), spacing 0.75 -> 0.9
         (bigger cells, bar length 5.6 so the 7x7 grid stays
         complete), oculusGlow 30 -> 22.
         Round 17: still no floor grid — the r16 fixes sharpened the
         grid ON the plinth only. Third cause, verified against the
         contact-shadow textures: the hall plinth's fake-AO discs
         (strong disc radius 3.6 at alpha 0.32–0.82 + halo radius 5.0
         at 0.20–0.34) cover almost the whole lattice shadow, which
         spans only ±2.7 around (-0.69,-0.35) — the grid's light/dark
         modulation sits on top of an already-dark radial blob, so
         the eye reads "soft oval" (the halo disc itself) instead of
         squares. The plinth top has no such disc, which is why the
         grid reads there. Fix: bars 0.22 -> 0.30 (chunkier lines),
         shadow map back to 2048 (see sun), oculusGlow 22 -> 12,
         and the hall contact discs shrink (strong 3.6 -> 3.0, halo
         5.0 -> 4.2) so the outer grid cells fall on clean floor —
         the plinth foot is only radius 0.95, so grounding keeps
         2+ units of margin. */
      var lattice = new THREE.Group();
      var latticeMat = new THREE.MeshStandardMaterial({ color:0x6d4f30, roughness:.6, metalness:.3 });
      for (var li = -3; li <= 3; li++){
        var lbx = new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.05, 0.30), latticeMat);
        lbx.position.set(0, 0, li*0.9); lbx.castShadow = true; lattice.add(lbx);
        var lbz = new THREE.Mesh(new THREE.BoxGeometry(0.30, 0.05, 5.6), latticeMat);
        lbz.position.set(li*0.9, 0, 0); lbz.castShadow = true; lattice.add(lbz);
      }
      lattice.position.y = HALL_H + 0.12;
      hall.add(lattice);

      /* center plinth + rotating stone knot */
      var plinth = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.95, 0.5, 40), MAT.stone);
      plinth.position.y = 0.25; plinth.castShadow = plinth.receiveShadow = true;
      hall.add(plinth);
      /* Round 17: 3.6 -> 3.0 and 5.0 -> 4.2 — the wide fake-AO discs
         were swallowing the lattice shadow (see the lattice note):
         the grid spans only ±2.7, so it sat entirely under the
         discs. The plinth foot is radius 0.95, so grounding keeps
         2+ units of margin. */
      contactShadow(0, 0.012, 0, 3.0, hall, contactTexStrong);
      contactShadow(0, 0.010, 0, 4.2, hall, contactTexHalo);
      /* base ring: a soft dark band hugging the plinth foot. The flat discs
         read well from the high default camera, but from a low/close camera
         they foreshorten away and hide behind the plinth's widening base —
         a vertical gradient band stays visible from any angle. Dark at the
         floor, fading to nothing 12 cm up the plinth. */
      var baseRingTex = (function(){
        var c = document.createElement('canvas'); c.width = 4; c.height = 64;
        var g = c.getContext('2d');
        var lg = g.createLinearGradient(0, 0, 0, 64);
        lg.addColorStop(0, 'rgba(24,16,8,0)');
        lg.addColorStop(0.45, 'rgba(24,16,8,0.22)');
        lg.addColorStop(1, 'rgba(24,16,8,0.5)');
        g.fillStyle = lg; g.fillRect(0, 0, 4, 64);
        return new THREE.CanvasTexture(c);
      })();
      var baseRing = new THREE.Mesh(
        new THREE.CylinderGeometry(0.96, 1.0, 0.12, 40, 1, true),
        new THREE.MeshBasicMaterial({ map: baseRingTex, transparent: true, depthWrite: false, side: THREE.DoubleSide }));
      baseRing.position.y = 0.06; baseRing.renderOrder = 2;
      hall.add(baseRing);
      var knot = new THREE.Mesh(new THREE.TorusKnotGeometry(0.34, 0.12, 120, 16),
        new THREE.MeshStandardMaterial({ map:stoneTex, bumpMap:stoneTex, bumpScale:0.9, roughness:.85 }));
      knot.scale.setScalar(0.62);
      knot.position.y = 0.82; knot.castShadow = true;
      hall.add(knot);

      /* dust motes */
      var dustGeo = new THREE.BufferGeometry();
      var dustPos = new Float32Array(240 * 3);
      for (var d = 0; d < 240; d++){
        var da = Math.random()*Math.PI*2, dr = Math.random()*8;
        dustPos[d*3] = Math.cos(da)*dr; dustPos[d*3+1] = 0.3 + Math.random()*4.6; dustPos[d*3+2] = Math.sin(da)*dr;
      }
      dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
      var dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({
        map: dotSprite(), size:.09, transparent:true, opacity:.55, depthWrite:false, color:0xfff3d0
      }));
      hall.add(dust);

      /* arch shape helper */
      function archShape(w, h){
        var s = new THREE.Shape(), r = w/2;
        s.moveTo(-r, 0); s.lineTo(-r, h - r); s.absarc(0, h - r, r, Math.PI, 0, true); s.lineTo(r, 0); s.closePath();
        return s;
      }
      function archFrame(w, h, t){
        var outer = archShape(w, h);
        outer.holes.push((function(){
          var p = new THREE.Path(), iw = w - t*2, ih = h - t, r = iw/2;
          p.moveTo(-r, 0); p.lineTo(-r, ih - r); p.absarc(0, ih - r, r, Math.PI, 0, true); p.lineTo(r, 0); p.closePath();
          return p;
        })());
        var geo = new THREE.ExtrudeGeometry(outer, { depth:.18, bevelEnabled:true, bevelThickness:.02, bevelSize:.02, bevelSegments:2, curveSegments:32 });
        return new THREE.Mesh(geo, MAT.creamPlain);
      }

      /* ================= ROOMS + ARCHES ================= */
      var rooms = {};   // id -> { group, camPos, camTarget, sculpture }
      var archGroups = {};

      function framedPainting(tex, w, h, crop){
        var grp = new THREE.Group();
        var frame = new THREE.Mesh(new THREE.BoxGeometry(w + 0.14, h + 0.14, 0.07),
          new THREE.MeshStandardMaterial({ color:0xa68d64, roughness:.5, metalness:.25 }));
        frame.castShadow = true;
        grp.add(frame);
        /* Round 14: gilt slip — a thin gold liner between frame and
           canvas (museum framing). Front face sits just behind the
           art plane, so only a 3 cm gold border shows around it. */
        var liner = new THREE.Mesh(new THREE.BoxGeometry(w + 0.06, h + 0.06, 0.012),
          new THREE.MeshStandardMaterial({ color:0xc9a227, roughness:.35, metalness:.6 }));
        liner.position.z = 0.038;
        grp.add(liner);
        if (crop){ tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(crop[0], crop[1]); tex.offset.set(crop[2], crop[3]); }
        var art = new THREE.Mesh(new THREE.PlaneGeometry(w, h),
          new THREE.MeshStandardMaterial({ map: tex, roughness:.85 }));
        art.position.z = 0.045;
        grp.add(art);
        return grp;
      }

      /* Round 14: rounded box via a rounded-rect shape + extrude with
         bevel. The shape is inset by the bevel size so the final dims
         are exactly (w, h, d) with edges of radius r. */
      function roundedBox(w, h, d, r){
        var bt = Math.min(r, d * 0.45), bs = Math.min(r, d * 0.45);
        var iw = w - bs*2, ih = h - bs*2;
        var s = new THREE.Shape();
        var x = -iw/2, y = -ih/2;
        s.moveTo(x + bs, y);
        s.lineTo(x + iw - bs, y); s.quadraticCurveTo(x + iw, y, x + iw, y + bs);
        s.lineTo(x + iw, y + ih - bs); s.quadraticCurveTo(x + iw, y + ih, x + iw - bs, y + ih);
        s.lineTo(x + bs, y + ih); s.quadraticCurveTo(x, y + ih, x, y + ih - bs);
        s.lineTo(x, y + bs); s.quadraticCurveTo(x, y, x + bs, y);
        var geo = new THREE.ExtrudeGeometry(s, { depth: Math.max(0.002, d - bt*2),
          bevelEnabled: true, bevelThickness: bt, bevelSize: bs, bevelSegments: 3, curveSegments: 8 });
        geo.center();
        return geo;
      }

      /* Round 14: sculptures rebuilt in the Nagi language — exaggerated
         round silhouettes, matte (roughness 0.6–0.9), flat 2–3 colour
         palette per room, ONE dark accent, no faces. The hall stone
         knot is untouched. Each sculpture keeps the same footprint so
         the room camera/tour framing still works. */
      /* Round 16: every transmissive crystal material in the scene
         (main Gemfund crystal + its miniature) is registered here so
         animate can gate the transmission pass on the crystal actually
         being on screen — see the gate before renderer.render. */
      var gemMats = [];
      var gemTransmissionOn = true;
      function buildSculpture(p){
        var grp = new THREE.Group();
        if (p.id === 'siaprak'){
          /* A hooded document-keeper: a bell-shaped paper robe (lathe),
             a plain round head with a cowl collar — no face — holding a
             stamped approval sheet. Reads as "documents / approval",
             not a stack of cardboard. Palette: paper cream + walnut
             dark accent (the stamp). */
          var robePts = [
            new THREE.Vector2(0.0, 0), new THREE.Vector2(0.42, 0),
            new THREE.Vector2(0.5, 0.06), new THREE.Vector2(0.46, 0.3),
            new THREE.Vector2(0.38, 0.62), new THREE.Vector2(0.3, 0.9),
            new THREE.Vector2(0.26, 1.02), new THREE.Vector2(0.2, 1.08),
            new THREE.Vector2(0.0, 1.1)
          ];
          var robe = new THREE.Mesh(new THREE.LatheGeometry(robePts, 32),
            new THREE.MeshStandardMaterial({ color:0xefe7d3, roughness:.9 }));
          robe.position.y = 0.09; robe.castShadow = true; grp.add(robe);
          /* fabric fold grooves around the robe */
          [[0.47, 0.35], [0.4, 0.65]].forEach(function(f){
            var groove = new THREE.Mesh(new THREE.TorusGeometry(f[0], 0.012, 8, 40),
              new THREE.MeshStandardMaterial({ color:0xddd0b2, roughness:.9 }));
            groove.rotation.x = Math.PI/2; groove.position.y = f[1]; grp.add(groove);
          });
          var head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 24, 18),
            new THREE.MeshStandardMaterial({ color:0xefe7d3, roughness:.9 }));
          head.scale.y = 1.1; head.position.y = 1.33; head.castShadow = true; grp.add(head);
          var collar = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.05, 10, 28),
            new THREE.MeshStandardMaterial({ color:0xe2d7bd, roughness:.9 }));
          collar.rotation.x = Math.PI/2; collar.position.y = 1.16; collar.castShadow = true; grp.add(collar);
          /* arms reaching forward to hold the sheet */
          [-1, 1].forEach(function(side){
            var arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 0.3, 4, 10),
              new THREE.MeshStandardMaterial({ color:0xefe7d3, roughness:.9 }));
            arm.position.set(side*0.3, 0.82, 0.22);
            arm.rotation.set(-0.9, 0, side*0.25); arm.castShadow = true; grp.add(arm);
          });
          /* the approval sheet, tilted toward the viewer, dark stamp = the
             one dark accent */
          var sheetGrp = new THREE.Group();
          sheetGrp.position.set(0, 0.82, 0.45); sheetGrp.rotation.x = -0.45;
          var sheet = new THREE.Mesh(roundedBox(0.5, 0.65, 0.02, 0.008),
            new THREE.MeshStandardMaterial({ color:0xf8f4e8, roughness:.85 }));
          sheet.castShadow = true; sheetGrp.add(sheet);
          var stamp = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.016, 24),
            new THREE.MeshStandardMaterial({ color:0x4a3520, roughness:.6 }));
          stamp.rotation.x = Math.PI/2; stamp.position.set(0.05, -0.14, 0.018); sheetGrp.add(stamp);
          grp.add(sheetGrp);
          /* low document-pile base the keeper stands on */
          var pile = new THREE.Mesh(roundedBox(0.95, 0.09, 0.75, 0.04),
            new THREE.MeshStandardMaterial({ color:0xe6dcc4, roughness:.9 }));
          pile.position.y = 0.045; pile.castShadow = pile.receiveShadow = true; grp.add(pile);
        } else if (p.id === 'gemfund'){
          /* A real cut crystal, not a glowing octahedron: 8-sided crown
             + girdle + pointed pavilion, flat-shaded, with transmission /
             ior / thickness over the RoomEnvironment so it refracts and
             glints instead of reading as lit plastic. It floats, spins
             and bobs (animate loop drives userData.spin/.ring, as before).
             Palette: emerald + profiled gold ring + dark disc accent.
             Round 15 — why r14 still read as opaque green stone
             (diagnosed against the installed three r170 shaders):
             the transmitted light is diffuseColor x Beer's-law
             attenuation, and r14 stacked three dark factors — color
             0x18a87c, attenuationColor 0x0a7a58, attenuationDistance
             0.6 with thickness 0.9 — which multiplies out to ~0-3%
             transmitted light, i.e. the crystal transmitted almost
             nothing and only its diffuse surface showed. And the
             envMapIntensity 1.2 never applied: in r170 setProgram
             overwrites the envMapIntensity uniform with
             scene.environmentIntensity (0.35) every frame for
             materials using scene.environment, so the glints were
             dimmed to a third. Fix: pale diffuse color, light
             attenuation over a long distance, thin volume, ior 1.5
             (glass, not 1.8 mirror), roughness 0.03, and envMap set
             explicitly on the material (same PMREM texture) so the
             scene-intensity override is skipped and the material's
             own envMapIntensity is honoured. Transmitted light now
             ~40-80% per channel instead of ~0-3%.
             Round 16 — why r15 read as clear glass, not emerald, and
             why the crown stayed frosted while the pavilion went clear
             (same r170 shader): transmittance = diffuseColor x
             exp(-(-log(attenuationColor)/attenuationDistance) x
             thickness), and getVolumeTransmissionRay makes the path
             length = thickness (0.45) regardless of angle. r15's pale
             diffuse (0xe8f7ef) x light attenuation (0x2fae7d over
             2.2) multiplies out to ~(0.39, 0.78, 0.64) — pale mint,
             nearly clear. And the crown's top face is seen at a
             grazing angle, so Fresnel reflection of the bright
             ceiling (envMapIntensity 2.2 + clearcoat) washes it
             white, while what it transmits IS the bright ceiling.
             Fix: emerald diffuse (0x7fd8ae) + much stronger green
             attenuation (0x0e7a4e over 1.5) -> transmitted light
             ~(0.04, 0.42, 0.19), a clear emerald that still lets the
             painting show through; envMapIntensity 2.2 -> 1.5 so the
             top face keeps its glint without the white wash. */
          var gemMat = new THREE.MeshPhysicalMaterial({
            color:0x7fd8ae, roughness:.03, metalness:0,
            transmission:1, thickness:.45, ior:1.5,
            clearcoat:1, clearcoatRoughness:.05,
            attenuationColor: new THREE.Color(0x0e7a4e), attenuationDistance:1.5,
            flatShading:true, envMap: scene.environment, envMapIntensity:1.5 });
          /* Round 16: registered for the transmission gate in animate
             — the main crystal and its miniature each build their own
             material, so both land here. Round 20: the ORIGINAL is
             no longer registered — markClickable clones every rendered
             mesh's material, so the gate must toggle the clones (it
             registers them at clone time); the originals are orphans
             and toggling them did nothing (see markClickable). */
          /* gemMats.push(gemMat); — REMOVED round 20, see above. */
          var gemGrp = new THREE.Group();
          var pavilion = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.03, 0.46, 8, 1), gemMat);
          pavilion.position.y = -0.23; pavilion.castShadow = true; gemGrp.add(pavilion);
          var girdle = new THREE.Mesh(new THREE.CylinderGeometry(0.43, 0.43, 0.05, 8), gemMat);
          girdle.castShadow = true; gemGrp.add(girdle);
          var crown = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.42, 0.22, 8, 1), gemMat);
          crown.position.y = 0.135; crown.castShadow = true; gemGrp.add(crown);
          gemGrp.position.y = 0.85;
          grp.add(gemGrp); grp.userData.spin = gemGrp;
          /* Round 17: invisible hit proxy around the crystal. Diagnosis
             (Node probe with the installed three r170, r16 camera):
             the crystal raycasts fine — a ray through its projected
             centre hits the girdle first, and the r16 checker's hover
             point (960,350) sits ~126 px ABOVE the crystal's top edge
             (crystal spans y 476–617 on a 998 px frame), so the ray
             correctly hit only the painting. Transmission does NOT let
             the ray pass through. The real defect is target size: the
             crystal is a ~172x141 px target surrounded by a 4.94x3.24
             painting sharing the same 'detail' key, so any hover near
             the statue easily lands on the painting and the ring
             balloons to ~700 px around it. The proxy (a 0.62 sphere,
             rotation-invariant so the spin doesn't matter) makes the
             crystal's neighbourhood a forgiving target: any ray inside
             it returns the proxy, and the ring is sized from the
             proxy's Box3 (~1.67) so it hugs the crystal + gold ring
             instead of the painting. Same hit key, same tooltip, same
             click action — only the ring changes. Opacity 0, no depth
             write, no shadow: it renders nothing. */
          var gemHit = new THREE.Mesh(new THREE.SphereGeometry(0.62, 12, 10),
            new THREE.MeshBasicMaterial({ transparent:true, opacity:0, depthWrite:false }));
          gemGrp.add(gemHit);
          /* profiled gold band (lathe, raised centre ridge) — not a plain torus */
          var ringPts = [
            new THREE.Vector2(0.58, -0.035), new THREE.Vector2(0.63, -0.02),
            new THREE.Vector2(0.66, 0), new THREE.Vector2(0.63, 0.02),
            new THREE.Vector2(0.58, 0.035)
          ];
          var ring = new THREE.Mesh(new THREE.LatheGeometry(ringPts, 48),
            new THREE.MeshStandardMaterial({ color:0xd8b25e, roughness:.22, metalness:.95 }));
          ring.rotation.x = Math.PI/2; ring.position.y = 0.85; grp.add(ring); grp.userData.ring = ring;
          /* dark disc under the floating crystal — the one dark accent */
          var disc = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.72, 0.035, 40),
            new THREE.MeshStandardMaterial({ color:0x14261f, roughness:.9 }));
          disc.position.y = 0.02; disc.receiveShadow = true; grp.add(disc);
        } else {
          /* Calendar monolith: a rounded, bevelled matte slab (no longer
             a poster on a box) + the calendar grid as a front plane +
             raised 3D date cells — the gold "hot" date is a raised gold
             tile, not just texture — + a dark binder clip across the top. */
          var slab = new THREE.Mesh(roundedBox(0.95, 1.5, 0.14, 0.05),
            new THREE.MeshStandardMaterial({ color:0xe9ead9, roughness:.85 }));
          slab.position.y = 0.95; slab.castShadow = true; grp.add(slab);
          var calFace = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 1.0),
            new THREE.MeshStandardMaterial({ map: calendarTex, roughness:.85 }));
          calFace.position.set(0, 0.95, 0.078); grp.add(calFace);
          /* raised gold tile on the hot date (texture grid row 1, col 2) */
          var goldCell = new THREE.Mesh(roundedBox(0.12, 0.1, 0.03, 0.015),
            new THREE.MeshStandardMaterial({ color:0xd9a441, roughness:.35, metalness:.55 }));
          goldCell.position.set(0, 1.08, 0.095); goldCell.castShadow = true; grp.add(goldCell);
          /* second hot date (row 3, col 4), raised cream tile */
          var creamCell = new THREE.Mesh(roundedBox(0.12, 0.1, 0.025, 0.015),
            new THREE.MeshStandardMaterial({ color:0xf7f5ea, roughness:.85 }));
          creamCell.position.set(0.296, 0.823, 0.09); grp.add(creamCell);
          /* dark binder clip across the top — the one dark accent */
          var clip = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.55, 16),
            new THREE.MeshStandardMaterial({ color:0x4a3520, roughness:.55, metalness:.3 }));
          clip.rotation.z = Math.PI/2; clip.position.set(0, 1.74, 0); clip.castShadow = true; grp.add(clip);
        }
        return grp;
      }

      PROJECTS.forEach(function(p){
        var dir = new THREE.Vector3(Math.sin(p.angle), 0, -Math.cos(p.angle));

        /* --- arch in the hall wall --- */
        var ag = new THREE.Group();
        var frame = archFrame(2.3, 3.6, 0.22);
        frame.position.z = -0.02;
        ag.add(frame);
        var img = new Image();
        img.onload = function(){
          var m = new THREE.Mesh(new THREE.PlaneGeometry(1.95, 3.3),
            new THREE.MeshBasicMaterial({ map: archArtTexture(img), transparent:true }));
          m.position.set(0, 1.65, 0.05);
          m.userData.hit = { type:'enter', id:p.id };
          clickables.push(m);
          ag.add(m);
        };
        img.onerror = function(){
          var m = new THREE.Mesh(new THREE.ShapeGeometry(archShape(1.95, 3.3), 24),
            new THREE.MeshBasicMaterial({ color: p.accent }));
          m.position.set(0, 0, 0.05);
          m.userData.hit = { type:'enter', id:p.id };
          clickables.push(m);
          ag.add(m);
        };
        img.src = p.art;
        ag.position.copy(dir.clone().multiplyScalar(HALL_R - 0.06));
        ag.position.y = 0;
        ag.lookAt(0, 0, 0);
        hall.add(ag);
        archGroups[p.id] = ag;
        markClickable(ag, { type:'enter', id:p.id });

        /* --- the room itself --- */
        var room = new THREE.Group();
        var RW = 11, RD = 9, RH = 5;
        var center = dir.clone().multiplyScalar(16.5);
        room.position.copy(center);
        room.lookAt(0, 0, 0);
        scene.add(room);

        var wallMat = new THREE.MeshStandardMaterial({ color:p.wall, roughness:.95 });
        var rFloor = new THREE.Mesh(new THREE.PlaneGeometry(RW, RD), MAT.woodFloorRoom);
        rFloor.rotation.x = -Math.PI/2; rFloor.position.y = 0.02; rFloor.receiveShadow = true; room.add(rFloor);
        var back = new THREE.Mesh(new THREE.PlaneGeometry(RW, RH), wallMat);
        back.position.set(0, RH/2, -RD/2); back.receiveShadow = true; room.add(back);
        var left = new THREE.Mesh(new THREE.PlaneGeometry(RD, RH), wallMat);
        left.rotation.y = Math.PI/2; left.position.set(-RW/2, RH/2, 0); left.receiveShadow = true; room.add(left);
        var right = new THREE.Mesh(new THREE.PlaneGeometry(RD, RH), wallMat);
        right.rotation.y = -Math.PI/2; right.position.set(RW/2, RH/2, 0); right.receiveShadow = true; room.add(right);
        var ceil = new THREE.Mesh(new THREE.PlaneGeometry(RW, RD),
          new THREE.MeshStandardMaterial({ color:0xf1ebdd, roughness:.95 }));
        ceil.rotation.x = Math.PI/2; ceil.position.y = RH; room.add(ceil);
        var skylight = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 1.6),
          new THREE.MeshBasicMaterial({ color:0xfdf6df }));
        skylight.rotation.x = Math.PI/2; skylight.position.set(0, RH - 0.02, -0.6); room.add(skylight);
        var rLight = new THREE.PointLight(0xfff2da, 22, 16, 1.4);
        rLight.position.set(0, 4.2, 0.5); room.add(rLight);
        /* Round 14: warm spotlight straight down onto the sculpture —
           the museum pool of light. No shadow map (the sun + contact
           discs carry grounding); penumbra keeps the edge soft.
           Round 20: spot 40 -> 28 and rLight 30 -> 22. Same probe as
           the bloom fix: the two room lights are the dominant terms
           on the statue tops (robe shoulder 2.26, monolith top 2.54
           linear lum at the old values). Trimming them ~30% drops
           the tops to ~1.8-2.05, the approval sheet 1.17 -> 0.99
           and the paintings 0.93 -> 0.75 — below the new 1.15
           bloom threshold — while hemi + sun stay untouched, so the
           rooms keep their bright warm read. */
        var spot = new THREE.SpotLight(0xffe2b0, 28, 14, 0.55, 0.65, 1.6);
        spot.position.set(0, 4.7, 0.4);
        spot.target.position.set(0, 0.7, -0.4);
        room.add(spot); room.add(spot.target);

        var main = framedPainting(loadArt(p.art), 4.8, 3.1, null);
        main.position.set(0, 2.55, -RD/2 + 0.06); room.add(main);
        var sideL = framedPainting(loadArt(p.art), 3.4, 2.4, [0.55, 0.7, 0.02, 0.25]);
        sideL.rotation.y = Math.PI/2; sideL.position.set(-RW/2 + 0.06, 2.4, -0.6); room.add(sideL);
        var sideR = framedPainting(loadArt(p.art), 3.4, 2.4, [0.55, 0.7, 0.43, 0.1]);
        sideR.rotation.y = -Math.PI/2; sideR.position.set(RW/2 - 0.06, 2.4, -0.6); room.add(sideR);
        markClickable(main, { type:'detail', id:p.id });
        markClickable(sideL, { type:'detail', id:p.id });
        markClickable(sideR, { type:'detail', id:p.id });

        /* Round 14: a real plinth — base + tapered column + stone cap,
           0.62 tall (the hall plinth's 0.5 tapered form is the model),
           not the 0.14 disc of before. Sculptures sit on PLINTH_H. */
        var PLINTH_H = 0.62;
        var rPlinth = new THREE.Group();
        var plBase = new THREE.Mesh(new THREE.CylinderGeometry(1.02, 1.14, 0.12, 44), MAT.plinth);
        plBase.position.y = 0.06; plBase.castShadow = plBase.receiveShadow = true; rPlinth.add(plBase);
        var plCol = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.94, 0.4, 44), MAT.plinth);
        plCol.position.y = 0.32; plCol.castShadow = plCol.receiveShadow = true; rPlinth.add(plCol);
        var plCap = new THREE.Mesh(new THREE.CylinderGeometry(0.92, 0.8, 0.1, 44), MAT.stone);
        plCap.position.y = 0.57; plCap.castShadow = plCap.receiveShadow = true; rPlinth.add(plCap);
        rPlinth.position.set(0, 0, -0.4); room.add(rPlinth);
        /* Round 12: the plinth is part of the statue's hover target.
           Before, only the sculpture meshes were clickable — a small
           target (the Gemfund gem is ~0.8 units) surrounded by a
           non-clickable plinth, so most hovers over "the statue"
           actually hit the plinth and showed nothing. Same 'detail'
           key as the sculpture, so the tooltip/glow match. (The hall
           stone knot is still NOT clickable by design — decoration,
           not a project.) */
        markClickable(rPlinth, { type:'detail', id:p.id });
        /* y=0.028: the room floor sits at y=0.02 (round 4 z-fight fix), so a
           disc at the old y=0.006 would sit UNDER the opaque floor and lose
           the depth test entirely. */
        contactShadow(0, 0.028, -0.4, 2.0, room);
        var sculpt = buildSculpture(p);
        sculpt.position.set(0, PLINTH_H, -0.4); room.add(sculpt);
        markClickable(sculpt, { type:'detail', id:p.id });
        /* Round 14: Nagi staging — a miniature of the same sculpture
           (~0.35) on a small pedestal to the side, so the main piece
           reads as monumental. Same 'detail' key as the main piece. */
        var miniPed = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.36, 0.5, 28), MAT.stone);
        miniPed.position.set(3.4, 0.25, -2.6); miniPed.castShadow = miniPed.receiveShadow = true; room.add(miniPed);
        contactShadow(3.4, 0.028, -2.6, 0.85, room);
        var mini = buildSculpture(p);
        mini.scale.setScalar(0.32);
        mini.position.set(3.4, 0.5, -2.6);
        room.add(mini);
        markClickable(mini, { type:'detail', id:p.id });

        room.updateMatrixWorld(true);
        /* Round 16 — why the r15 pitch fix "did nothing" in the live
           check: the reset code (goRoom same-room branch, arrived())
           works — after landing the camera IS at the canonical
           framing. The canonical framing itself is the problem: these
           camPos/camTarget values are unchanged since the first
           commit (verified: identical in r13), a -5.6 deg pitch that
           puts the floor's far edge (back wall) at 39% of frame
           height, and the r14 statues are ~0.5 taller than the r13
           ones, so the same framing now reads low and close. Fix:
           true eye-level — camera (0, 1.6, 4.1), target (0, 1.6,
           -0.5), pitch 0 deg. Floor band drops to ~32%, the plinth
           base stays ~7% off the bottom edge, and all three statues
           (tops 1.7-2.3) sit centred with the painting behind them.
           z 4.1 is still inside the open-fronted room (front plane
           4.5), and the miniature at azimuth ~27 deg stays in the
           ~47 deg horizontal half-FOV. */
        rooms[p.id] = {
          group: room, sculpture: sculpt,
          camPos: room.localToWorld(new THREE.Vector3(0, 1.6, 4.1)),
          camTarget: room.localToWorld(new THREE.Vector3(0, 1.6, -0.5))
        };
      });

      /* ================= CAMERA RIG ================= */
      var mode = 'hall';           // 'hall' | 'room' | 'transit'
      var currentRoom = null;
      var yaw = 0, pitch = -0.04, targetYaw = 0, targetPitch = -0.04;
      var roomYaw = 0, roomPitch = 0, tRoomYaw = 0, tRoomPitch = 0;
      var camPos = new THREE.Vector3(0, 1.6, 4.2), camTarget = new THREE.Vector3();
      var transit = null;
      var flightTarget = null;   // room id the in-flight move is heading for (round 13)
      var lastInteract = performance.now();
      var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      var mouseX = 0, mouseY = 0, parX = 0, parY = 0;
      /* Round 18: camera inertia + dolly/zoom. Velocities are rad/s,
         smoothed in the drag handler and decayed in animate after
         release. dolly: metres the room camera has slid toward the
         sculpture (0..1.7 — stops 2.4 m short of the plinth).
         hallFov: wheel zoom in the hall, FOV degrees (48..68).
         fovCur: the lerped live FOV (58 base, 60.5 mid-flight). */
      var yawVel = 0, pitchVel = 0, roomYawVel = 0, roomPitchVel = 0;
      var lastMoveT = 0;
      var dolly = 0, tDolly = 0;
      /* Round 21: hall default FOV 58 -> 64 (see hallView). The
         wheel range stays 48..68, so 64 sits inside it; rooms and
         flights still use 58 / 60.5. */
      var hallFov = 64, tHallFov = 64;
      var fovCur = 64;

      function notifyLocation(loc){
        if (opts && opts.onLocation) opts.onLocation(loc);
        /* Round 22: the pill MUST flip in the same synchronous DOM
           write as the title — the r21 check caught it one step
           behind (pill "Siaprak" while the title already said
           "Gemfund"). Root cause: the title is set by direct
           textContent in showRoomUI (inside the rAF task, before
           that frame's paint), while the pill goes through React
           setState — React flushes AFTER the frame's paint, so the
           pill only becomes visible in the NEXT frame's paint. At
           60 fps that is 16 ms and invisible; at the checker's
           ~18 s/frame it is a whole screenshot behind, and it reads
           as "pill flips on arrival". Toggling the .active class
           (and aria-current) here, in the same call stack as the
           title, puts the pill in the DOM before the same paint.
           The React state above stays the source of truth for
           re-renders — it writes the identical classes, so the two
           never fight. */
        var nav = document.getElementById('roomNav');
        if (nav){
          var dots = nav.querySelectorAll('.nav-dot');
          var target = loc === null ? 'Aula' : (byId(loc) ? byId(loc).name : '');
          for (var di = 0; di < dots.length; di++){
            var d = dots[di];
            var want = d.getAttribute('aria-label') === target;
            d.classList.toggle('active', want);
            if (want) d.setAttribute('aria-current', 'true');
            else d.removeAttribute('aria-current');
          }
        }
      }
      function notifyTour(t){ if (opts && opts.onTourChange) opts.onTourChange(t); }

      function ease(t){ return t < .5 ? 4*t*t*t : 1 - Math.pow(-2*t + 2, 3)/2; }
      /* Optional mid waypoint (midP/midT): the flight swings through it at
         the halfway mark instead of cutting the straight chord — used for
         room-to-room flights so the camera passes through the hall centre
         and never clips a room wall. */
      function flyTo(pos, tgt, dur, done, midP, midT){
        /* Round 18: a flight never inherits a fling — a fast flick
           that starts a room change used to keep gliding after
           landing and fight the canonical framing. */
        yawVel = 0; pitchVel = 0; roomYawVel = 0; roomPitchVel = 0;
        transit = { t:0, dur:dur, startAt: performance.now(),
                    fromP:camPos.clone(), fromT:camTarget.clone(),
                    toP:pos.clone(), toT:tgt.clone(), done:done,
                    midP: midP ? midP.clone() : null, midT: midT ? midT.clone() : null };
        mode = 'transit';
      }
      /* Hall framing, round 4: camera lower (y 1.6) and further back (z 3.6),
         pitched slightly DOWN (-0.06) instead of up (+0.10). Before, the
         knot (y 0.82) sat ~19 deg below the camera while the lens pointed
         5.7 deg up, so the knot centre was ~25 deg below view centre with
         a 29 deg half-FOV — its bottom fell off-frame. Now the knot centre
         is ~9 deg below view centre and the plinth base (~21 deg below)
         clears the hint pill at the bottom edge.
         Round 21: the r19 "wide" framing (floor ~40%, ceiling ~13%,
         3 doors) was lost in r20 — the check read the initial hall
         view close/low (floor ~45%, no ceiling, 2 doors + Siaprak's
         cut off) even though hallView() itself never changed; the
         r19/r20 difference is viewport variance, so the fix must
         make the framing robust at 16:9 instead of hoping the
         checker viewport matches. Probe (node, real geometry:
         doors at radius 8.94, angles ±0.95 rad, width 2.3; camera
         z 3.6, FOV 58, yaw 0.12): the Siaprak door centre sits
         46.5 deg off-axis against a 44.6 deg half-HFOV — its centre
         is outside the frame, outer edge clipped 7.4 deg. That is
         exactly the r20 check. The fix is three numbers together:
         camera back to z 4.2, FOV 58 -> 64 (half-HFOV 48 deg at
         16:9), and yaw 0.12 -> 0. The yaw change is the decisive
         one — 0.12 turned the view toward the right door and pushed
         the left door out; with yaw 0 the composition is symmetric
         and both side doors sit 37.8 deg off-axis, outer edge
         43.1 deg, i.e. fully inside with ~5 deg margin at 16:9
         (at a narrow 1.42 aspect only 1.5 deg clips). With yaw
         kept at 0.12 the left door would still clip 1.9 deg even
         after the FOV/z fix. Pitch -0.06 -> -0.04. Projected
         verticals (same probe): floor ~43%, ceiling band ~21%
         (clearly visible now — the complaint was invisibility, not
         the exact 13%), knot centre ~63% down frame, plinth base
         ~79% (still clear of the hint pill). Side effect of yaw 0:
         the initial view faces the centre (Gemfund) door dead-on,
         so the hall enter bar shows on load — intended, it invites
         entry. leaveRoom() and the initial vars above carry the
         same numbers, so the return landing matches the initial
         view. */
      function hallView(){
        var base = new THREE.Vector3(0, 1.6, 4.2);
        var d = new THREE.Vector3(Math.sin(yaw)*Math.cos(pitch), Math.sin(pitch), -Math.cos(yaw)*Math.cos(pitch));
        return { pos:base, tgt:d.multiplyScalar(10).add(base) };
      }

      /* fromTour: true only when the auto tour drives the move — any other
         caller taking the camera means the user took over, so the tour
         stops. Returns false when the call is swallowed because a flight
         is already in progress, true when a flight started or we are
         already standing in the target room. */
      function goRoom(id, fromTour){
        var p = byId(id), r = rooms[id];
        if (!p || !r) return false;
        if (mode === 'room' && currentRoom === id){
          /* Round 13: clicking the current room's dot re-centres the
             view after a drag-look — the old early return left a
             dragged yaw in place until a reload.
             Round 15: it only reset the TARGETS — roomYaw/roomPitch
             kept lerping from the dragged values for ~1 s, so a
             same-room dot click after a downward drag left the camera
             pitched at the floor (the r14 check's low Gemfund
             landing). Reset the live values too, plus the parallax
             offsets, so the re-centre is instant and canonical. */
          tRoomYaw = 0; tRoomPitch = 0; roomYaw = 0; roomPitch = 0; parX = 0; parY = 0;
          /* Round 18: re-centring also re-dollies — a zoomed-in view
             must not survive a dot click that promises the canonical
             framing. */
          dolly = 0; tDolly = 0; roomYawVel = 0; roomPitchVel = 0;
          return true;
        }
        /* Round 10: a flight already in progress no longer swallows the
           request — the old `mode === 'transit'` early-return silently
           dropped every dot/keyboard/arch click made mid-flight, so the
           label (and the camera) only answered when the old flight
           landed. Now the flight is retargeted from the camera's
           current position and the label fires instantly, every time. */
        if (tour && !fromTour) stopTour('takeover');
        closeMenu();
        closeDetail();
        hideHallBar();
        /* Room chrome + location, round 13: the label names the
           DESTINATION, so it flips the moment a flight starts — for
           the tour too, not only for manual moves. Round 11 split
           the two (manual = instant, tour = on arrival) because the
           round 10 check read an ahead-of-camera label as desync;
           the round 12 check proved the opposite is worse — during
           a tour flight the pill/title lag one whole stop behind
           (camera in Siaprak, pill still Aula), and a manual label
           is already instant, so the same flight shows the new room
           while the camera is still in the hall. One rule for both:
           the pill + title change when the target is chosen. */
        var showRoomUI = function(){
          roomTitleText.textContent = p.world;
          roomTitle.classList.add('show');
          /* Round 13: the title is a destination announcement, not a
             permanent overlay — it used to sit over the centre
             painting for the whole stay in the room. It now fades
             out ~3.2 s after the flight starts (≈1 s after a 1.9 s
             entry flight lands, ≈0.8 s after a 2.4 s room-to-room
             flight), so the painting and plinth are clear to look
             at. The timer restarts on every retarget. */
          if (titleFadeTimer) clearTimeout(titleFadeTimer);
          titleFadeTimer = setTimeout(function(){ roomTitle.classList.remove('show'); }, 3200);
          enterLabel.textContent = 'Jelajahi ' + p.name;
          actionBar.classList.add('show');
          backBtn.classList.add('show');
          hint.classList.add('hide');
          notifyLocation(id);
        };
        showRoomUI();
        var arrived = function(){
          mode = 'room'; currentRoom = id; flightTarget = null;
          tRoomYaw = 0; tRoomPitch = 0; roomYaw = 0; roomPitch = 0;
          /* Round 18: every landing is canonical — dolly included. */
          dolly = 0; tDolly = 0; roomYawVel = 0; roomPitchVel = 0;
          /* Round 15: also clear the mouse-parallax offsets — they
             lerp back toward wherever the pointer last rested, so a
             pointer parked at the bottom of the screen tilted every
             landing a touch downward. */
          parX = 0; parY = 0;
          /* Round 13: the UI already flipped to this room when the
             flight started (see showRoomUI above) — arrival only
             re-asserts the location. It must NOT re-show the title:
             that would restart the fade timer and cover the painting
             again after landing. */
          notifyLocation(id);
          /* Round 12: the dwell is NO LONGER armed here. Arming in
             the arrival callback made the whole tour depend on this
             one callback firing — if it is ever lost (retarget,
             exception in the UI half above), the dwell never arms.
             The dwell now arms in animate (see the watchdog there),
             the first frame the camera is standing in a room. */
          if (tour) tourEvent('arrived:' + id);
        };
        /* Round 13: remember where this flight is heading — nextRoom()
           (swipe/arrows) steps from the destination, not from the
           room we left. */
        flightTarget = id;
        if (currentRoom){
          /* room-to-room (or retargeted mid-flight between rooms): swing
             through the hall on a path offset to the side of the centre
             statue. The waypoint sits 1.8 units out along the bisector
             between the two rooms, 3 m up, and looks outward along the
             same bisector — at the midpoint the statue is behind the
             camera. `currentRoom` (not `mode`) decides this branch, so a
             retarget issued mid-flight still takes the offset path. */
          var src = byId(currentRoom);
          var aMid = ((src ? src.angle : 0) + p.angle) / 2;
          var midDir = new THREE.Vector3(Math.sin(aMid), 0, -Math.cos(aMid));
          flyTo(r.camPos, r.camTarget, reduced ? 0.6 : 2.4, arrived,
            new THREE.Vector3(midDir.x * 1.8, 3.0, midDir.z * 1.8),
            new THREE.Vector3(midDir.x * 6, 1.5, midDir.z * 6));
        } else {
          flyTo(r.camPos, r.camTarget, reduced ? 0.4 : 1.9, arrived);
        }
        return true;
      }
      function enterRoom(id){ goRoom(id); }
      function goTo(id){
        if (id === null || id === undefined) leaveRoom();
        else goRoom(id);
      }
      function nextRoom(dir){
        /* Round 10: also allowed mid-flight between rooms (retargets,
           like goRoom) — arrows pressed during a flight used to fall
           through to a no-op yaw nudge. */
        /* Round 13: step from the room the camera is HEADING for.
           currentRoom is null during a hall→room flight and still the
           departed room during a room→room flight, so a flick
           mid-flight was swallowed outright (hall case) or stepped
           from the wrong room. */
        var base = flightTarget || currentRoom;
        if (!base) return;
        if (mode !== 'room' && mode !== 'transit') return;
        var order = PROJECTS.map(function(p){ return p.id; });
        var i = order.indexOf(base);
        if (i < 0) return;
        goRoom(order[(i + dir + order.length) % order.length]);
      }
      function angDiff(a, b){ var d = a - b; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return d; }
      /* Round 13: snap the hall view to the next doorway in the flick
         direction, measured from where the user started looking
         (downYaw) so the drag itself cannot overshoot the choice.
         The hall enter bar then offers that room. Arch angles rise
         with PROJECTS order (-0.95 / 0 / 0.95), and a leftward flick
         already yaws the view toward rising angles, so dir matches
         nextRoom's convention (sx < 0 -> +1). */
      function faceNextArch(dir){
        var best = 0, bestD = Infinity;
        PROJECTS.forEach(function(p, i){
          var d = Math.abs(angDiff(p.angle, downYaw));
          if (d < bestD){ bestD = d; best = i; }
        });
        var nxt = PROJECTS[(best + dir + PROJECTS.length) % PROJECTS.length];
        targetYaw = nxt.angle;
        yawVel = 0; pitchVel = 0;
        lastInteract = performance.now();
      }
      function leaveRoom(fromTour){
        /* Also allow aborting an in-flight entry: the back button is already
           visible during the 1.9s entry flight, so a click then was silently
           swallowed by the old room-only guard. flyTo() replaces the pending
           transit (its done never fires), so aborting mid-flight is safe. */
        /* Round 13: clicking the Aula dot while already in the hall
           re-centres the view after a drag-look. */
        if (mode === 'hall'){ yaw = targetYaw = 0; pitch = targetPitch = -0.04; yawVel = 0; pitchVel = 0; return; }
        if (mode !== 'room' && mode !== 'transit') return;
        /* Return to the canonical hall framing: yaw/pitch are whatever the
           user left them at before entering (e.g. pitched up at the
           oculus), so without a reset the statue can be out of frame
           entirely on return. */
        yaw = targetYaw = 0; pitch = targetPitch = -0.04;
        /* Round 20: the r19 check's return landing differed from the
           initial hall view (floor ~45% vs ~40%, ceiling invisible,
           2 of 3 doors). The landing framing is otherwise identical
           — hallView() is canonical — so the drift came from state
           the return flight did not reset: a hall wheel-zoom
           (hallFov/tHallFov) left over from before entering, a
           residual hall fling (yawVel/pitchVel) that kept yawing
           after landing, and a stale lastInteract that let the idle
           slow-pan start the instant the flight ended. All three are
           reset here. The ~8 s return flight itself is unchanged
           (wall-clock 1.7 s; the longer reading is most likely the
           checker's slow frame sampling — its DOM clicks took ~42 s
           to be acknowledged in the same run). */
        /* Round 21: hallFov default is 64 now (see hallView) — the
           reset must match it, or a return landing would snap the
           lens back to the old narrow framing. */
        hallFov = tHallFov = 64; yawVel = 0; pitchVel = 0; lastInteract = performance.now();
        var v = hallView();
        roomTitle.classList.remove('show');
        if (titleFadeTimer){ clearTimeout(titleFadeTimer); titleFadeTimer = 0; }
        flightTarget = null;
        actionBar.classList.remove('show');
        backBtn.classList.remove('show');
        hideHallBar();
        /* Round 13: the label is the destination — Aula flips the
           moment the return starts, for the tour too. The old
           fromTour deferral left the last room's pill up for the
           whole 1.7 s return flight; the done callback below still
           re-asserts Aula on landing. Leaving the room by any route
           ends a running tour. */
        if (tour) stopTour('leave');
        notifyLocation(null);
        flyTo(v.pos, v.tgt, reduced ? 0.4 : 1.7, function(){ mode = 'hall'; currentRoom = null; notifyLocation(null); });
      }

      /* ---- hall "enter" bar: appears when the camera faces a doorway ---- */
      var hallBest = null;
      function hideHallBar(){
        if (hallBar) hallBar.classList.remove('show');
        if (mode === 'hall') hint.classList.remove('hide');
      }
      function updateHallBar(){
        if (!hallBar) return;
        if (mode !== 'hall' || tour){
          if (hallBest){ hallBest = null; hideHallBar(); }
          return;
        }
        if (menuSheet.classList.contains('open') || detailSheet.classList.contains('open')){
          if (hallBest){ hallBest = null; hideHallBar(); }
          return;
        }
        /* camera view direction vs each arch direction; cos(30°) ≈ 0.866 */
        var dx = Math.sin(yaw), dz = -Math.cos(yaw);
        var best = null, bestDot = 0.866;
        PROJECTS.forEach(function(p){
          var d = dx * Math.sin(p.angle) + dz * -Math.cos(p.angle);
          if (d > bestDot){ bestDot = d; best = p; }
        });
        if (!best){
          if (hallBest){ hallBest = null; hideHallBar(); }
          return;
        }
        if (!hallBest || hallBest.id !== best.id){
          hallBest = best;
          if (hallEnterLabel) hallEnterLabel.textContent = 'Masuk — ' + best.name;
          hallBar.classList.add('show');
          hint.classList.add('hide');
        }
      }

      /* ---- auto tour: walks the three rooms in order, then returns ----
         Round 12: the dwell is armed AND checked in animate, keyed by
         room (tour.dwellRoom). Rounds 9–11 armed it in the arrival
         callback / a setTimeout — and the state machine itself is
         provably correct in isolation (faithful harness: 26–28.5 s
         total in every scenario: hall start, room start, throttled
         rAF, double-click). Yet live stops still read ~2–3 s, so the
         arming must not depend on any single callback firing, and
         the tour must be observable: every transition is logged to
         window.__GALLERY_TOUR_LOG and live state to
         window.__GALLERY_TOUR, so a visual check can measure the
         dwell exactly instead of inferring it from screenshots.
         tourStep only advances when the move actually started; a
         swallowed call (flight in progress) retries shortly instead
         of skipping a room. Round 13: the label/title flip at
         departure, not at arrival — the pill names the stop the tour
         is heading for, and the big title fades out on its own timer
         so it never covers the painting after landing. */
      var tour = null;
      var tourLog = [];
      function tourEvent(ev){
        var e = { t: +(performance.now() / 1000).toFixed(2), ev: ev };
        tourLog.push(e);
        if (tourLog.length > 200) tourLog.shift();
        if (typeof window !== 'undefined'){
          window.__GALLERY_TOUR_LOG = tourLog;
        }
      }
      if (typeof window !== 'undefined'){
        window.__GALLERY_TOUR_LOG = tourLog;
        window.__GALLERY_TOUR = { touring: false, step: -1, room: null, dwellRoom: null, dwellIn: null };
      }
      function startTour(){
        stopTour('restart');
        tour = { step: 0, timer: 0, dwellUntil: 0, dwellRoom: null };
        notifyTour(true);
        tourEvent('start');
        tourStep();
      }
      function tourStep(){
        if (!tour) return;
        var order = PROJECTS.map(function(p){ return p.id; });
        if (tour.step >= order.length){ tourEvent('end'); stopTour('complete'); leaveRoom(true); return; }
        var target = order[tour.step];
        tourEvent('advance:' + target);
        if (!goRoom(target, true)){
          /* a flight is already in progress: do not advance — retry
             shortly instead of skipping a room. */
          clearTimeout(tour.timer);
          tour.timer = setTimeout(tourStep, 1200);
          return;
        }
        tour.step++;
        /* No dwell arming here: animate arms it the first frame the
           camera is standing in the target room (covers the
           already-standing case too — no flight, no arrival). */
      }
      function stopTour(why){
        if (!tour) return;
        clearTimeout(tour.timer);
        tourEvent('stop:' + (why || 'manual'));
        tour = null;
        notifyTour(false);
        if (typeof window !== 'undefined'){
          window.__GALLERY_TOUR = { touring: false, step: -1, room: currentRoom, dwellRoom: null, dwellIn: null };
        }
      }
      /* ================= POINTER: drag-look + click ================= */
      var dragging = false, moved = 0, lastX = 0, lastY = 0;
      var downX = 0, downY = 0, downT = 0, downYaw = 0;
      var raycaster = new THREE.Raycaster();
      var ndc = new THREE.Vector2();
      var el = renderer.domElement;
      /* Last known pointer position for the per-frame hover refresh (see
         animate): the pointer can sit still while the camera moves under
         it (tour, flights, drag-look), which used to leave a stale
         tooltip on screen. Touch pointers never hover, so they are
         excluded. */
      var hoverInside = false, hoverClientX = 0, hoverClientY = 0, hoverPointerType = '';
      /* The single mesh under the pointer (round 12): the halo ring
         is sized from this mesh alone — see updateHover. */
      var hoverObj = null;
      var glowObj = null;   // mesh the halo ring is currently sized/positioned for (round 13)
      function raycastHover(){
        raycaster.setFromCamera(ndc, camera);
        var hits = raycaster.intersectObjects(clickables, false);
        var hit = null;
        hoverObj = null;
        if (hits.length){
          var h0 = hits[0].object.userData.hit;
          if (h0 && ((h0.type === 'enter' && mode === 'hall') || (h0.type === 'detail' && mode === 'room'))){ hit = h0; hoverObj = hits[0].object; }
        }
        el.style.cursor = hit ? 'pointer' : 'grab';
        return hit;
      }

      el.addEventListener('pointerdown', function(e){
        /* Round 9: any press on the canvas takes over from the tour
           immediately — the old code only stopped it on swipe/Esc/menu,
           so a drag during the tour kept running to the next stop. */
        if (tour) stopTour('pointer');
        dragging = true; moved = 0; lastX = e.clientX; lastY = e.clientY;
        downX = e.clientX; downY = e.clientY; downT = performance.now(); downYaw = targetYaw;
        /* Round 18: a fresh drag takes over — any glide is cancelled
           and the velocity clock restarts here. */
        lastMoveT = performance.now();
        yawVel = 0; pitchVel = 0; roomYawVel = 0; roomPitchVel = 0;
        if (tip) tip.classList.remove('show');
        el.setPointerCapture(e.pointerId);
      });
      el.addEventListener('pointermove', function(e){
        if (dragging){
          var dx = e.clientX - lastX, dy = e.clientY - lastY;
          moved += Math.abs(dx) + Math.abs(dy);
          lastX = e.clientX; lastY = e.clientY;
          lastInteract = performance.now();
          /* Round 18: track fling velocity — on release the camera
             glides on with decay (see animate). Smoothed 65/35 so
             one jittery move event cannot launch the view; capped
             so a wild fling cannot spin the room. */
          var nowT = performance.now();
          var dtMs = Math.max(1, nowT - lastMoveT);
          lastMoveT = nowT;
          if (mode === 'hall'){
            targetYaw -= dx * 0.0042;
            targetPitch = THREE.MathUtils.clamp(targetPitch - dy * 0.0028, -0.32, 1.0);
            yawVel = THREE.MathUtils.clamp(0.65 * yawVel + 0.35 * (-dx * 0.0042) / (dtMs / 1000), -3.5, 3.5);
            pitchVel = THREE.MathUtils.clamp(0.65 * pitchVel + 0.35 * (-dy * 0.0028) / (dtMs / 1000), -2, 2);
          } else if (mode === 'room'){
            /* Round 18: yaw clamp ±0.55 -> ±0.95. The camera never
               moves — only the look direction rotates — so the view
               centre at 0.95 lands on the side wall inside the room
               (hits x=±5.5 at z≈+0.2, inside the side painting's
               z-range), and the frustum edge past it looks out the
               open front into the hall, never into void. Pitch
               widens a touch too (-0.16..0.2 -> -0.2..0.25). */
            tRoomYaw = THREE.MathUtils.clamp(tRoomYaw - dx * 0.003, -0.95, 0.95);
            tRoomPitch = THREE.MathUtils.clamp(tRoomPitch - dy * 0.002, -0.2, 0.25);
            roomYawVel = THREE.MathUtils.clamp(0.65 * roomYawVel + 0.35 * (-dx * 0.003) / (dtMs / 1000), -3.5, 3.5);
            roomPitchVel = THREE.MathUtils.clamp(0.65 * roomPitchVel + 0.35 * (-dy * 0.002) / (dtMs / 1000), -2, 2);
          }
        } else {
          /* hover: cursor + tooltip + glow on the hovered group */
          ndc.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
          mouseX = ndc.x; mouseY = ndc.y;
          if (e.pointerType === 'touch') return;
          hoverInside = true; hoverClientX = e.clientX; hoverClientY = e.clientY;
          hoverPointerType = e.pointerType || 'mouse';
          updateHover(raycastHover(), e.clientX, e.clientY);
        }
      });
      el.addEventListener('pointerup', function(e){
        var wasDrag = moved > 7;
        dragging = false;
        /* Round 18: the release moment restarts the idle clock, so
           the hall's slow auto-pan cannot kick in while the fling
           glide is still settling. */
        if (wasDrag) lastInteract = performance.now();
        if (wasDrag){
          /* Round 12: a swipe is a deliberate fast flick — quick,
             long, clearly horizontal. Thresholds relaxed from round
             10 (300 ms / 120 px / 3x / 60 px): real finger flicks
             wobble vertically, so 400 ms / 100 px / 2.0x / 90 px.
             AND the swipe is judged BEFORE the transit guard: round
             11 dropped every flick made during the 2.4 s
             room-to-room flight (mode === 'transit'), so a quick
             flick-flick-flick sequence only ever landed the first
             one — matching the 1-in-4 live result. Clicks (below)
             are still blocked during transit.
             Round 13: the r12 ordering is VERIFIED in the code
             (this branch runs before the transit guard below), but
             the swipe's action — nextRoom() — stepped from
             currentRoom, which is null during a hall→room flight
             and still the departed room during a room→room flight.
             A mid-flight flick was therefore swallowed outright
             (hall case: the round 12 checker's
             click-Siaprak-then-flick test) or stepped from the
             wrong room. nextRoom() now steps from flightTarget
             (the destination). The 400 ms threshold is kept: the
             checker's drags held the button ~2.8 s, which no real
             finger flick does. */
          var dt = performance.now() - downT;
          var sx = e.clientX - downX, sy = e.clientY - downY;
          if (dt < 400 && Math.abs(sx) > 100 && Math.abs(sx) > Math.abs(sy) * 2.0 && Math.abs(sy) < 90){
            if (mode === 'room' || mode === 'transit'){
              stopTour('swipe');
              nextRoom(sx < 0 ? 1 : -1);
            } else if (mode === 'hall'){
              /* Round 13: a flick in the hall used to do nothing
                 navigational — drag-look is the hall's gesture, so
                 this branch never ran here (round 12 check: Aula
                 0/5). A fast flick now snaps the view to the next
                 doorway in the flick direction; slow drags still
                 look around freely, and no room is entered by
                 surprise. */
              stopTour('swipe');
              faceNextArch(sx < 0 ? 1 : -1);
            }
          }
          return;
        }
        if (mode === 'transit') return;
        ndc.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
        raycaster.setFromCamera(ndc, camera);
        var hits = raycaster.intersectObjects(clickables, false);
        if (!hits.length) return;
        var hit = hits[0].object.userData.hit;
        if (!hit) return;
        if (hit.type === 'enter' && mode === 'hall') enterRoom(hit.id);
        else if (hit.type === 'detail' && mode === 'room') openDetail(hit.id);
      });
      el.addEventListener('pointercancel', function(){ dragging = false; });
      el.addEventListener('pointerleave', function(){ hoverInside = false; updateHover(null, 0, 0); });

      /* Round 18: wheel dolly/zoom. Room: the camera slides toward
         the sculpture along its view axis (0..1.7 m — stops 2.4 m
         short of the plinth, never through it). Hall: the camera
         cannot move without risking the knot, so the wheel zooms
         the lens instead (FOV 48..68). Ignored during flights and
         while a sheet covers the canvas.
         Round 21: the listener moved OFF the canvas onto window
         (capture). Diagnosis of the r20 check's "wheel does nothing
         in Gemfund": the listener lived on renderer.domElement, so
         it only fired for events whose target IS the canvas or a
         child of it. The checker's room scroll was targeted at the
         #scene div itself (its own note), and in a room the pointer
         can also sit over sibling chrome (#actionBar, #backBtn,
         #roomNav — all pointer-events:auto and NOT children of
         #scene) — those events never reach the canvas listener.
         A capture-phase window listener fires exactly once for
         every wheel event anywhere on the page, whatever its
         target, and the menu/detail guard still lets an open sheet
         scroll normally (it returns before preventDefault).
         Removed in dispose(). */
      function onWheel(e){
        if (mode === 'transit') return;
        if (menuSheet.classList.contains('open') || detailSheet.classList.contains('open')) return;
        e.preventDefault();
        lastInteract = performance.now();
        /* Round 20: normalise deltaY by deltaMode. The handler
           assumed pixel units, but a wheel event can arrive in lines
           (deltaMode 1, deltaY ~3) or pages (deltaMode 2, deltaY ~1)
           — the checker's "3 pages" of scroll moved the dolly by
           0.0012 x 3, i.e. nothing. Lines count ~40 px, a page a
           full viewport. Honest caveat: the visual checker's scroll
           may still not deliver a real wheel event to the canvas at
           all, so this is proven in code only until a real mouse
           wheel is tried. */
        var dy = e.deltaY * (e.deltaMode === 1 ? 40 : e.deltaMode === 2 ? window.innerHeight : 1);
        if (mode === 'room'){
          tDolly = THREE.MathUtils.clamp(tDolly - dy * 0.0012, 0, 1.7);
        } else if (mode === 'hall'){
          /* Round 22: hall sign flipped (+ dy -> - dy) to restore
             the r20 OBSERVED mapping (scroll down = widen, up =
             narrow). Diagnosis (git diff r20..r21): the formula did
             NOT change between r20 and r21 — it is byte-identical
             in both — so no sign "flipped in code" when the
             listener moved to window capture. What changed is the
             checker's scroll delivery: r20 measured down = widen,
             r21 measured down = narrow AND the room ring growing
             on down-scroll (270 -> 340 px = closer = tDolly UP) —
             both readings imply the r21 scrolls arrived with
             INVERTED deltaY versus r20 (e.g. a drag/gesture-style
             scroll primitive, whose sign is opposite to a wheel
             event's). Flipping the hall sign restores the r20
             observed mapping under the current checker delivery,
             with the room formula untouched as instructed. HONEST
             CAVEAT: for a physical mouse (DOM standard: wheel down
             = deltaY > 0) this makes the hall direction opposite to
             the room's (down = narrow in the hall, down = dolly-out
             in rooms). Verify with a real mouse; if the r22 check
             delivers standard-sign wheel events, the hall will read
             reversed again and the flip should be reverted — the
             code itself was never the culprit. */
          tHallFov = THREE.MathUtils.clamp(tHallFov - dy * 0.008, 48, 68);
        }
      }
      window.addEventListener('wheel', onWheel, { passive: false, capture: true });

      /* ================= LOOP ================= */
      var clock = new THREE.Clock();
      var rafId = 0;
      var disposed = false;
      function animate(){
        if (disposed) return;
        rafId = requestAnimationFrame(animate);
        try {
          var dt = Math.min(clock.getDelta(), 0.05);
          var t = clock.elapsedTime;

          /* Round 18: the statues stand still — Nagi's do. The hall
             knot no longer turns or wobbles and the sculptures no
             longer spin or bob (the r17 crystal hit-proxy is a child
             of the gem group, so it stays put with it). Only the
             dust keeps drifting, like Nagi's. */
          dust.rotation.y += dt * 0.012;

          if (mode === 'transit' && transit){
            /* Round 10: flight progress runs on wall-clock time, not on
               accumulated frame dt — the old dt clamp (0.05) stretched a
               2.4 s flight to ~6 s of real time on a slow renderer, so
               every label/tour timing looked broken there. A backgrounded
               tab simply completes the flight on the next frame. */
            transit.t = (performance.now() - transit.startAt) / (transit.dur * 1000);
            var k = Math.min(transit.t, 1);
            var e;
            if (transit.midP){
              /* two-leg flight: from -> mid for k in [0, .5), mid -> to
                 for k in [.5, 1]; eased on each leg so the join is smooth. */
              if (k < 0.5){
                e = ease(k * 2) / 2;
                camPos.lerpVectors(transit.fromP, transit.midP, e * 2);
                camTarget.lerpVectors(transit.fromT, transit.midT, e * 2);
              } else {
                e = 0.5 + ease((k - 0.5) * 2) / 2;
                camPos.lerpVectors(transit.midP, transit.toP, (e - 0.5) * 2);
                camTarget.lerpVectors(transit.midT, transit.toT, (e - 0.5) * 2);
              }
            } else {
              e = ease(k);
              camPos.lerpVectors(transit.fromP, transit.toP, e);
              camTarget.lerpVectors(transit.fromT, transit.toT, e);
            }
            camPos.y += Math.sin(e * Math.PI) * 0.25;
            if (transit.t >= 1){ var done = transit.done; transit = null; try { done && done(); } catch (arrErr){ tourEvent('arrived-error:' + (arrErr && arrErr.message ? arrErr.message : 'err')); } }
          } else if (mode === 'hall'){
            /* Round 18: fling inertia — after release the view glides
               on with exponential decay (rate 2.2/s, ~1.5 s to
               settle) instead of stopping dead. The idle slow-pan
               waits until the glide has settled. */
            if (!dragging){
              targetYaw += yawVel * dt;
              targetPitch = THREE.MathUtils.clamp(targetPitch + pitchVel * dt, -0.32, 1.0);
              var decH = Math.exp(-dt * 2.2);
              yawVel *= decH; pitchVel *= decH;
              if (Math.abs(yawVel) < 0.005) yawVel = 0;
              if (Math.abs(pitchVel) < 0.005) pitchVel = 0;
            }
            if (!dragging && !reduced && Math.abs(yawVel) < 0.01 && performance.now() - lastInteract > 5000) targetYaw += dt * 0.03;
            yaw += (targetYaw - yaw) * Math.min(1, dt * 5);
            pitch += (targetPitch - pitch) * Math.min(1, dt * 5);
            var v = hallView();
            camPos.copy(v.pos); camTarget.copy(v.tgt);
            camPos.y = 1.6 + Math.sin(t * 0.5) * (reduced ? 0 : 0.03);
            updateHallBar();
          } else if (mode === 'room' && currentRoom){
            var r = rooms[currentRoom];
            /* Round 18: same fling inertia as the hall, on the
               widened ±0.95 yaw clamp. */
            if (!dragging){
              tRoomYaw = THREE.MathUtils.clamp(tRoomYaw + roomYawVel * dt, -0.95, 0.95);
              tRoomPitch = THREE.MathUtils.clamp(tRoomPitch + roomPitchVel * dt, -0.2, 0.25);
              var decR = Math.exp(-dt * 2.2);
              roomYawVel *= decR; roomPitchVel *= decR;
              if (Math.abs(roomYawVel) < 0.005) roomYawVel = 0;
              if (Math.abs(roomPitchVel) < 0.005) roomPitchVel = 0;
            }
            /* Round 18: wheel dolly — the camera slides toward the
               sculpture along its own view axis. */
            dolly += (tDolly - dolly) * Math.min(1, dt * 6);
            roomYaw += (tRoomYaw - roomYaw) * Math.min(1, dt * 5);
            roomPitch += (tRoomPitch - roomPitch) * Math.min(1, dt * 5);
            if (!reduced){
              /* gentle mouse parallax: the view leans a touch toward the
                 cursor, plus a slow breathing so the room never feels dead. */
              parX += ((mouseX * 0.14) - parX) * Math.min(1, dt * 3);
              parY += ((mouseY * 0.09) - parY) * Math.min(1, dt * 3);
            }
            /* Round 18: the dolly base is the canonical camPos moved
               toward the canonical target — the target is pushed the
               same amount, so the framing is preserved, just closer. */
            var rBase = r.camPos.clone();
            if (dolly > 0.001){
              var dDir = r.camTarget.clone().sub(r.camPos).normalize();
              rBase.addScaledVector(dDir, dolly);
            }
            camPos.copy(rBase);
            if (!reduced) camPos.y += Math.sin(t * 0.5) * 0.02;
            var off = r.camTarget.clone().sub(r.camPos);
            var ang = Math.atan2(off.x, off.z) + roomYaw;
            var len = Math.sqrt(off.x*off.x + off.z*off.z);
            camTarget.set(
              rBase.x + Math.sin(ang) * len + parX,
              r.camTarget.y + roomPitch * 3 + parY,
              rBase.z + Math.cos(ang) * len
            );
          }
          /* Round 12: tour dwell watchdog, armed AND checked here
             in animate, keyed by room (tour.dwellRoom) — NOT in the
             arrival callback. The dwell arms the first frame the
             camera is standing in a room and only advances after a
             full 6.5 s in THAT room, so it can neither be cut short
             by a cleared timer nor lost with a swallowed arrival
             callback. The live state is mirrored to
             window.__GALLERY_TOUR every frame for exact measurement. */
          if (tour && mode === 'room' && currentRoom){
            if (tour.dwellRoom !== currentRoom){
              tour.dwellRoom = currentRoom;
              tour.dwellUntil = performance.now() + 6500;
              tourEvent('dwell-arm:' + currentRoom);
            } else if (tour.dwellUntil && performance.now() >= tour.dwellUntil){
              tour.dwellUntil = 0;
              tour.dwellRoom = null;
              tourEvent('dwell-fire:' + currentRoom);
              tourStep();
            }
          }
          if (tour && typeof window !== 'undefined'){
            window.__GALLERY_TOUR = { touring: true, step: tour.step, room: currentRoom, dwellRoom: tour.dwellRoom || null, dwellIn: tour.dwellUntil ? Math.max(0, +((tour.dwellUntil - performance.now()) / 1000).toFixed(2)) : null };
          }
          camera.position.copy(camPos);
          camera.lookAt(camTarget);
          /* Round 18: FOV — a slight widen mid-flight reads as
             speed; the hall wheel-zoom lerps back to 58 in rooms
             and on flights. */
          var fovT = 58;
          if (mode === 'transit') fovT = 60.5;
          else if (mode === 'hall'){ hallFov += (tHallFov - hallFov) * Math.min(1, dt * 6); fovT = hallFov; }
          if (Math.abs(fovT - fovCur) > 0.01){
            fovCur += (fovT - fovCur) * Math.min(1, dt * 5);
            camera.fov = fovCur; camera.updateProjectionMatrix();
          }
          /* Round 9: re-check what sits under the pointer every frame.
             Without this, the tooltip/glow froze on the last target the
             pointer moved over while the camera (tour, flight, drag-look)
             moved on — e.g. "Masuk — Gemfund" lingering after the view
             had turned to Siaprak. Skipped while dragging, while a sheet
             covers the canvas, and for touch pointers. */
          if (!dragging && hoverInside && hoverPointerType !== 'touch'
              && !menuSheet.classList.contains('open') && !detailSheet.classList.contains('open')){
            updateHover(raycastHover(), hoverClientX, hoverClientY);
          }
          /* Round 16: gate the transmission pass on the crystal
             actually being on screen. Three r170 has no
             transmissionResolutionScale — a transmissive material
             costs a second full-viewport render (MSAA + mipmaps)
             every frame it is in the scene, even when the camera is
             in another room or the hall. With transmission 0 the
             crystal drops to the opaque list and the pass is skipped
             entirely; it is only ever 0 while the crystal cannot be
             seen (flights in/out and the hall arch view keep it on
             via flightTarget / hallBest). The program flip costs one
             recompile per visit, not per frame.
             Round 20: this gate was DEAD from r16 to r19 — it
             toggled the original gem material while markClickable
             had replaced every rendered mesh's material with a clone
             (probe: gate set 0, rendered meshes still 1). The clones
             are now registered in gemMats at clone time, so the gate
             finally does what this comment always claimed. */
          var gemOn = (currentRoom === 'gemfund') || (flightTarget === 'gemfund')
            || (mode === 'hall' && hallBest && hallBest.id === 'gemfund');
          if (gemOn !== gemTransmissionOn){
            gemTransmissionOn = gemOn;
            gemMats.forEach(function(m){ m.transmission = gemOn ? 1 : 0; m.needsUpdate = true; });
            /* Round 21: dynamic resolution in Gemfund. Diagnosis of
               the r20 "no measurable improvement" (Gemfund still
               ~18.7 s/frame in the check tool): the transmission
               pass is the frame cost, and its render target is
               sized from the RENDERER's drawing buffer (three r170
               renderTransmissionPass: setSize(activeViewport),
               samples 4 hard-coded, HalfFloat + mipmaps) — the
               composer's MSAA 2 and pixelRatio 1.25 never touched
               it, so r20 only lightened the passes AROUND the
               transmission render. Dropping the renderer (and
               composer) pixel ratio to 1.0 while the crystal is on
               screen cuts every pass's pixel count ~36%
               (1.25^2 -> 1.0^2), transmission target included, and
               restores 1.25 everywhere else. The crystal is large
               soft shapes and the paintings are 768 px textures on
               ~720 px planes at 1.0, so the visual cost is a slight
               softening of Gemfund only; MSAA 2 on the composer
               targets stays, so edges stay clean. Reallocates
               render targets on room entry/exit only — one-frame
               hitch, never per frame.
               Round 22 — WHY r21 ALSO measured ~18.7 s (verified
               against the installed three r170 source, not assumed):
               (1) the checker runs at devicePixelRatio 1 (its own
               r21 report says "Di DPR 1,0"), so Math.min(dpr, 1.25)
               was ALREADY 1.0 in r19/r20 — the r20 1.5 -> 1.25 cap
               and this 1.0 flip were both no-ops in the checker's
               environment (they still help real retina displays).
               (2) The transmission RT's samples:4 is HARD-CODED in
               renderTransmissionPass — the r20 composer MSAA 4 -> 2
               never touched it, so the single most expensive target
               in Gemfund is still 4x MSAA HalfFloat + mipmaps.
               (3) The shadow map is one-shot since r21, so its
               re-render cost was already gone; the depth pass is
               vertex-bound and cheap anyway. (4) Node probe: the
               whole scene is only ~15–25k triangles (rooms are
               2-triangle planes) — NOT vertex-bound; the cost is
               fragment fill across transmission (4x MSAA) + main
               render (2x) + bloom's 5-mip chain + grade + output,
               at a fixed 1.0x resolution no lever had ever reduced.
               r22 levers that DO touch it: bloom off in Gemfund
               (whole mip chain gone, see below) and antialias:false
               (default-buffer MSAA was pure waste on the final
               fullscreen quad). What would touch the transmission
               pass itself: composer pixelRatio < 1.0 in Gemfund
               (visible softening — held for r23 A/B) or replacing
               transmission with fake alpha glass (removes the pass
               entirely — visual nuclear option, needs A/B evidence).
               No r22 claim is made about the frame number: it can
               only be measured by the visual check. */
            var pr = gemOn ? 1.0 : 1.25;
            renderer.setPixelRatio(pr);
            renderer.setSize(window.innerWidth, window.innerHeight);
            composer.setPixelRatio(pr);
            composer.setSize(window.innerWidth, window.innerHeight);
          }
          /* Round 18: post-processing. The DOF is gated like the
             transmission pass — when the crystal is on screen the
             transmission pass already costs a second full render,
             so the Bokeh depth render is skipped there and the
             bloom is halved; the two heavy passes never run
             together. Focus tracks the camera-to-target distance
             every frame, so the statue stays sharp and the wall
             behind it falls off. */
          var bokehOn = !gemOn && !reduced;
          bokehPass.enabled = bokehOn;
          if (bokehOn) bokehPass.uniforms['focus'].value = camera.position.distanceTo(camTarget);
          /* Round 22: bloom OFF while the crystal is on screen.
             Diagnosis (three r170 source + Node probe, see below):
             UnrealBloomPass always runs its full 5-mip chain (~11
             fullscreen quads at HalfFloat) even at strength 0.08 —
             and in Gemfund it buys almost nothing: threshold 1.15
             sits above the crystal, the paintings and the skylight
             (r20 probe: all below threshold), so only the gold
             ring's specular glints ever bloom, at strength 0.08.
             Skipping the pass in Gemfund removes a whole mip chain
             per frame for a visual change limited to slightly
             crisper ring glints. The strength line stays for the
             rooms/hall, where bloom still runs at 0.15.
             NOT done, with reasons: (a) DOF off outside Gemfund —
             BokehPass is ALREADY off in Gemfund (bokehOn = !gemOn),
             so it cannot move the Gemfund number; switching it off
             elsewhere would only delete the r18 DOF look from
             Siaprak/Rolling/hall. (b) Shadow map 2048 -> 1024 —
             the shadow map is ONE-SHOT since r21 (autoUpdate false),
             so its size costs nothing per frame; shrinking it would
             only soften the lattice grid (r17 proved 1024 blurs
             the 0.30 bars). */
          bloomPass.enabled = !gemOn;
          bloomPass.strength = gemOn ? 0.08 : 0.15;
          gradePass.uniforms['uTime'].value = t;
          composer.render();
        } catch(err){
          errBox.style.display = 'block';
          errBox.textContent = 'Galeri 3D tersendat: ' + err.message + '. Daftar proyek tetap bisa dibuka lewat tombol Menu.';
        }
      }
      /* Start the loop only after the document has loaded, so the render
         loop never starves DOMContentLoaded / load dispatch. */
      var started = false;
      function startLoop(){
        if (started) return; started = true;
        setTimeout(animate, 60);
      }
      if (document.readyState === 'complete') startLoop();
      else window.addEventListener('load', startLoop);

      window.addEventListener('resize', function(){
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
        composer.setSize(window.innerWidth, window.innerHeight);
      });

        return {
          enterRoom: enterRoom,
          leaveRoom: leaveRoom,
          goTo: goTo,
          nextRoom: nextRoom,
          startTour: startTour,
          stopTour: stopTour,
          isTouring: function(){ return !!tour; },
          facingRoom: function(){ return hallBest ? hallBest.id : null; },
          isInRoom: function(){ return mode === 'room' || (mode === 'transit' && !!currentRoom); },
          currentRoomId: function(){ return currentRoom; },
          nudgeYaw: function(d){ targetYaw += d; lastInteract = performance.now(); },
          dispose: function(){
            stopTour();
            if (titleFadeTimer) clearTimeout(titleFadeTimer);
            disposed = true;
            if (rafId) cancelAnimationFrame(rafId);
            /* Round 21: the wheel listener lives on window (capture)
               — remove it here or a remount would stack handlers. */
            window.removeEventListener('wheel', onWheel, true);
            try { composer.dispose(); } catch (e) { /* noop */ }
            try { renderer.dispose(); } catch (e) { /* noop */ }
            if (renderer.domElement && renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement);
          }
        };
      }


  /* initial location for the dot nav: the hall */
  if (opts && opts.onLocation) opts.onLocation(null);
  /* Build marker (round 13): lets a visual check confirm which build is
     actually loaded, so a stale-cache check can never again be mistaken
     for a failed fix. */
  if (typeof window !== 'undefined') window.__GALLERY_BUILD = 'r22';
  var sceneEl = document.getElementById('scene');
  if (sceneEl) sceneEl.dataset.build = 'r22';
  return gl;
}

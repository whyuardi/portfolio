// Ported verbatim from the proven static gallery (portfolio export, fixed 22 Nov 2026).
// Only adaptations: PROJECTS comes in as a parameter, THREE is an npm import,
// and a dispose() was added for React unmount. No visual or behaviour changes.
// @ts-nocheck
import * as THREE from 'three';
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
      var renderer = new THREE.WebGLRenderer({ antialias:true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.32;
      if ('outputColorSpace' in renderer) renderer.outputColorSpace = THREE.SRGBColorSpace;
      container.appendChild(renderer.domElement);

      var scene = new THREE.Scene();
      scene.background = new THREE.Color(0xefe9db);
      scene.fog = new THREE.Fog(0xefe9db, 26, 60);

      var camera = new THREE.PerspectiveCamera(58, window.innerWidth/window.innerHeight, 0.1, 120);

      /* No PMREM environment map: sampling it per fragment is very costly
         under software WebGL, and it blocked first load. Hemisphere + key
         lights carry the scene instead. */

      var hemi = new THREE.HemisphereLight(0xfff6e6, 0xcfc2ab, 1.05);
      scene.add(hemi);
      var sun = new THREE.DirectionalLight(0xfff1d6, 1.6);
      sun.position.set(4, 12, 2);
      sun.castShadow = true;
      sun.shadow.mapSize.set(2048, 2048);
      sun.shadow.camera.left = -14; sun.shadow.camera.right = 14;
      sun.shadow.camera.top = 14; sun.shadow.camera.bottom = -14;
      sun.shadow.camera.far = 40;
      sun.shadow.bias = -0.0004;
      scene.add(sun);
      var fill = new THREE.DirectionalLight(0xdfeaf2, 0.35);
      fill.position.set(-6, 5, -8);
      scene.add(fill);
      var oculusGlow = new THREE.PointLight(0xffe6bf, 30, 20, 2);
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
        plinth: new THREE.MeshStandardMaterial({ color:0x55534e, roughness:.85 }),
        paper: new THREE.MeshStandardMaterial({ color:0xf6f1e3, roughness:.9 })
      };

      var clickables = [];
      /* Clone each clickable mesh's material once: several groups share
         materials (e.g. MAT.stone on the hall plinth and the Rolling slab),
         and the hover glow below writes to the material — without the clone
         a hovered sculpture would light the hall plinth too. */
      function markClickable(obj, data){ obj.traverse(function(o){ if (o.isMesh){ o.userData.hit = data; if (o.material && !o.userData._matCloned){ o.material = o.material.clone(); o.userData._matCloned = true; } clickables.push(o); } }); }

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
            /* Round 12: the ring is sized from the single mesh
               actually under the pointer (hoverObj), NOT from every
               object sharing the room's hit key. Round 11 unioned
               all 'detail' objects of the room (3 paintings +
               sculpture + plinth) into one Box3 — up to ~11 units
               wide — so the ring was a giant room-spanning circle
               centred on the room, never on the hovered painting,
               and a hovered sculpture showed no ring anywhere near
               itself. The band is also narrower/dimmer now (peak
               0.55 at 0.86 radius) and the sprite smaller
               (maxDim x 1.35, capped 6.5), so the painting stays
               readable under the hover. */
            if (hoverObj){
              var box = new THREE.Box3().expandByObject(hoverObj);
              var c = box.getCenter(new THREE.Vector3());
              var s = box.getSize(new THREE.Vector3());
              var m = Math.max(s.x, s.y, s.z);
              glowSprite.position.copy(c);
              glowSprite.scale.setScalar(Math.min(6.5, Math.max(2.0, m * 1.35)));
              glowSprite.material.opacity = 0.5;
            }
          } else {
            glowSprite.material.opacity = 0;
          }
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

      /* center plinth + rotating stone knot */
      var plinth = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.95, 0.5, 40), MAT.stone);
      plinth.position.y = 0.25; plinth.castShadow = plinth.receiveShadow = true;
      hall.add(plinth);
      contactShadow(0, 0.012, 0, 3.6, hall, contactTexStrong);
      contactShadow(0, 0.010, 0, 5.0, hall, contactTexHalo);
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
        if (crop){ tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(crop[0], crop[1]); tex.offset.set(crop[2], crop[3]); }
        var art = new THREE.Mesh(new THREE.PlaneGeometry(w, h),
          new THREE.MeshStandardMaterial({ map: tex, roughness:.85 }));
        art.position.z = 0.045;
        grp.add(art);
        return grp;
      }

      function buildSculpture(p){
        var grp = new THREE.Group();
        if (p.id === 'siaprak'){
          for (var i = 0; i < 3; i++){
            var sheet = new THREE.Mesh(new THREE.BoxGeometry(0.9 - i*0.1, 0.07, 1.2 - i*0.08), MAT.paper);
            sheet.position.y = 0.1 + i*0.075; sheet.rotation.y = (i - 1) * 0.22;
            sheet.castShadow = true; grp.add(sheet);
          }
          var stampBase = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.07, 0.34),
            new THREE.MeshStandardMaterial({ color:0x8a6844, roughness:.6 }));
          stampBase.position.set(0.12, 0.36, 0.1); stampBase.castShadow = true; grp.add(stampBase);
          var stampTop = new THREE.Mesh(new THREE.SphereGeometry(0.085, 20, 16),
            new THREE.MeshStandardMaterial({ color:0x6d4f30, roughness:.5 }));
          stampTop.position.set(0.12, 0.47, 0.1); stampTop.castShadow = true; grp.add(stampTop);
          var stampNeck = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.05, 0.1, 14),
            new THREE.MeshStandardMaterial({ color:0x6d4f30, roughness:.5 }));
          stampNeck.position.set(0.12, 0.41, 0.1); grp.add(stampNeck);
        } else if (p.id === 'gemfund'){
          var gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.42, 0),
            new THREE.MeshPhysicalMaterial({ color:0x0f9d7a, roughness:.12, metalness:.05,
              emissive:0x063f31, emissiveIntensity:.7, clearcoat:.6, flatShading:true }));
          gem.position.y = 0.85; gem.scale.y = 1.35; gem.castShadow = true;
          grp.add(gem); grp.userData.spin = gem;
          var ring = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.025, 12, 64),
            new THREE.MeshStandardMaterial({ color:0xd8b25e, roughness:.35, metalness:.45 }));
          ring.rotation.x = Math.PI/2; ring.position.y = 0.85; grp.add(ring); grp.userData.ring = ring;
        } else {
          var slab = new THREE.Mesh(new THREE.BoxGeometry(0.95, 1.5, 0.16),
            new THREE.MeshStandardMaterial({ map: calendarTex, roughness:.8 }));
          slab.position.y = 0.95; slab.castShadow = true; grp.add(slab);
          var slabBack = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.55, 0.1), MAT.stone);
          slabBack.position.set(0, 0.95, -0.06); grp.add(slabBack);
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
        var rLight = new THREE.PointLight(0xfff2da, 30, 16, 1.4);
        rLight.position.set(0, 4.2, 0.5); room.add(rLight);

        var main = framedPainting(loadArt(p.art), 4.8, 3.1, null);
        main.position.set(0, 2.55, -RD/2 + 0.06); room.add(main);
        var sideL = framedPainting(loadArt(p.art), 3.4, 2.4, [0.55, 0.7, 0.02, 0.25]);
        sideL.rotation.y = Math.PI/2; sideL.position.set(-RW/2 + 0.06, 2.4, -0.6); room.add(sideL);
        var sideR = framedPainting(loadArt(p.art), 3.4, 2.4, [0.55, 0.7, 0.43, 0.1]);
        sideR.rotation.y = -Math.PI/2; sideR.position.set(RW/2 - 0.06, 2.4, -0.6); room.add(sideR);
        markClickable(main, { type:'detail', id:p.id });
        markClickable(sideL, { type:'detail', id:p.id });
        markClickable(sideR, { type:'detail', id:p.id });

        var rPlinth = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.12, 0.14, 44), MAT.plinth);
        rPlinth.position.set(0, 0.07, -0.4); rPlinth.castShadow = rPlinth.receiveShadow = true; room.add(rPlinth);
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
        contactShadow(0, 0.028, -0.4, 1.7, room);
        var sculpt = buildSculpture(p);
        sculpt.position.set(0, 0.14, -0.4); room.add(sculpt);
        markClickable(sculpt, { type:'detail', id:p.id });

        room.updateMatrixWorld(true);
        rooms[p.id] = {
          group: room, sculpture: sculpt,
          camPos: room.localToWorld(new THREE.Vector3(0, 1.75, 3.6)),
          camTarget: room.localToWorld(new THREE.Vector3(0, 1.35, -0.5))
        };
      });

      /* ================= CAMERA RIG ================= */
      var mode = 'hall';           // 'hall' | 'room' | 'transit'
      var currentRoom = null;
      var yaw = 0.12, pitch = -0.06, targetYaw = 0.12, targetPitch = -0.06;
      var roomYaw = 0, roomPitch = 0, tRoomYaw = 0, tRoomPitch = 0;
      var camPos = new THREE.Vector3(0, 1.6, 3.6), camTarget = new THREE.Vector3();
      var transit = null;
      var lastInteract = performance.now();
      var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      var mouseX = 0, mouseY = 0, parX = 0, parY = 0;

      function notifyLocation(loc){ if (opts && opts.onLocation) opts.onLocation(loc); }
      function notifyTour(t){ if (opts && opts.onTourChange) opts.onTourChange(t); }

      function ease(t){ return t < .5 ? 4*t*t*t : 1 - Math.pow(-2*t + 2, 3)/2; }
      /* Optional mid waypoint (midP/midT): the flight swings through it at
         the halfway mark instead of cutting the straight chord — used for
         room-to-room flights so the camera passes through the hall centre
         and never clips a room wall. */
      function flyTo(pos, tgt, dur, done, midP, midT){
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
         clears the hint pill at the bottom edge. */
      function hallView(){
        var base = new THREE.Vector3(0, 1.6, 3.6);
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
        if (mode === 'room' && currentRoom === id) return true;
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
        /* Room chrome + location, round 11: for a manual move (dot,
           keyboard, arch, swipe) the destination is reported the
           moment it is chosen — the dot nav label used to lag one
           stop behind for the whole flight (round 9). For a
           tour-driven move the same instant update would put the UI
           1.9–2.4 s ahead of the camera at every stop (the desync
           seen in the round 10 check), so the tour reports the room
           only when the camera actually lands (see arrived). */
        var showRoomUI = function(){
          roomTitleText.textContent = p.world;
          roomTitle.classList.add('show');
          enterLabel.textContent = 'Jelajahi ' + p.name;
          actionBar.classList.add('show');
          backBtn.classList.add('show');
          hint.classList.add('hide');
          notifyLocation(id);
        };
        if (!fromTour) showRoomUI();
        var arrived = function(){
          mode = 'room'; currentRoom = id;
          tRoomYaw = 0; tRoomPitch = 0; roomYaw = 0; roomPitch = 0;
          if (fromTour) showRoomUI(); else notifyLocation(id);
          /* Round 12: the dwell is NO LONGER armed here. Arming in
             the arrival callback made the whole tour depend on this
             one callback firing — if it is ever lost (retarget,
             exception in the UI half above), the dwell never arms.
             The dwell now arms in animate (see the watchdog there),
             the first frame the camera is standing in a room. */
          if (tour) tourEvent('arrived:' + id);
        };
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
        if (!currentRoom) return;
        if (mode !== 'room' && mode !== 'transit') return;
        var order = PROJECTS.map(function(p){ return p.id; });
        var i = order.indexOf(currentRoom);
        if (i < 0) return;
        goRoom(order[(i + dir + order.length) % order.length]);
      }
      function leaveRoom(fromTour){
        /* Also allow aborting an in-flight entry: the back button is already
           visible during the 1.9s entry flight, so a click then was silently
           swallowed by the old room-only guard. flyTo() replaces the pending
           transit (its done never fires), so aborting mid-flight is safe. */
        if (mode !== 'room' && mode !== 'transit') return;
        /* Return to the canonical hall framing: yaw/pitch are whatever the
           user left them at before entering (e.g. pitched up at the
           oculus), so without a reset the statue can be out of frame
           entirely on return. */
        yaw = targetYaw = 0.12; pitch = targetPitch = -0.06;
        var v = hallView();
        roomTitle.classList.remove('show');
        actionBar.classList.remove('show');
        backBtn.classList.remove('show');
        hideHallBar();
        /* Round 9: same instant-location rule as goRoom — the dot nav
           must show Aula the moment the return starts, and leaving the
           room by any route ends a running tour. Round 11: at the end
           of a tour the label follows the same rule as the tour stops
           and only flips to Aula when the camera lands back in the
           hall (see the flight's done callback, below). */
        if (tour) stopTour('leave');
        if (!fromTour) notifyLocation(null);
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
         of skipping a room. During the tour the label/title follow
         the camera (they flip at arrival, not at departure), so the
         UI can never run ahead of the camera mid-flight. */
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
      var downX = 0, downY = 0, downT = 0;
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
        downX = e.clientX; downY = e.clientY; downT = performance.now();
        if (tip) tip.classList.remove('show');
        el.setPointerCapture(e.pointerId);
      });
      el.addEventListener('pointermove', function(e){
        if (dragging){
          var dx = e.clientX - lastX, dy = e.clientY - lastY;
          moved += Math.abs(dx) + Math.abs(dy);
          lastX = e.clientX; lastY = e.clientY;
          lastInteract = performance.now();
          if (mode === 'hall'){
            targetYaw -= dx * 0.0042;
            targetPitch = THREE.MathUtils.clamp(targetPitch - dy * 0.0028, -0.32, 1.0);
          } else if (mode === 'room'){
            tRoomYaw = THREE.MathUtils.clamp(tRoomYaw - dx * 0.003, -0.55, 0.55);
            tRoomPitch = THREE.MathUtils.clamp(tRoomPitch - dy * 0.002, -0.16, 0.2);
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
        if (wasDrag){
          /* Round 12: a swipe is a deliberate fast flick — quick,
             long, clearly horizontal. Thresholds relaxed from round
             10 (300 ms / 120 px / 3x / 60 px): real finger flicks
             wobble vertically, so 400 ms / 100 px / 2.0x / 90 px.
             AND the swipe is judged BEFORE the transit guard: round
             11 dropped every flick made during the 2.4 s
             room-to-room flight (mode === 'transit'), so a quick
             flick-flick-flick sequence only ever landed the first
             one — matching the 1-in-4 live result. nextRoom()
             already retargets mid-flight, so a swipe during transit
             just retargets the flight. Clicks (below) are still
             blocked during transit. */
          if (mode === 'room' || mode === 'transit'){
            var dt = performance.now() - downT;
            var sx = e.clientX - downX, sy = e.clientY - downY;
            if (dt < 400 && Math.abs(sx) > 100 && Math.abs(sx) > Math.abs(sy) * 2.0 && Math.abs(sy) < 90){
              stopTour('swipe');
              nextRoom(sx < 0 ? 1 : -1);
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

          knot.rotation.y += dt * (reduced ? 0.05 : 0.25);
          knot.rotation.x = Math.sin(t * 0.4) * 0.15;
          dust.rotation.y += dt * 0.012;

          Object.keys(rooms).forEach(function(id){
            var s = rooms[id].sculpture;
            if (s.userData.spin){
              s.userData.spin.rotation.y += dt * 0.7;
              s.userData.spin.position.y = 0.85 + Math.sin(t * 1.1) * 0.05;
              if (s.userData.ring) s.userData.ring.position.y = s.userData.spin.position.y;
            }
          });

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
            if (!dragging && !reduced && performance.now() - lastInteract > 5000) targetYaw += dt * 0.03;
            yaw += (targetYaw - yaw) * Math.min(1, dt * 5);
            pitch += (targetPitch - pitch) * Math.min(1, dt * 5);
            var v = hallView();
            camPos.copy(v.pos); camTarget.copy(v.tgt);
            camPos.y = 1.6 + Math.sin(t * 0.5) * (reduced ? 0 : 0.03);
            updateHallBar();
          } else if (mode === 'room' && currentRoom){
            var r = rooms[currentRoom];
            roomYaw += (tRoomYaw - roomYaw) * Math.min(1, dt * 5);
            roomPitch += (tRoomPitch - roomPitch) * Math.min(1, dt * 5);
            if (!reduced){
              /* gentle mouse parallax: the view leans a touch toward the
                 cursor, plus a slow breathing so the room never feels dead. */
              parX += ((mouseX * 0.14) - parX) * Math.min(1, dt * 3);
              parY += ((mouseY * 0.09) - parY) * Math.min(1, dt * 3);
            }
            camPos.copy(r.camPos);
            if (!reduced) camPos.y += Math.sin(t * 0.5) * 0.02;
            var off = r.camTarget.clone().sub(r.camPos);
            var ang = Math.atan2(off.x, off.z) + roomYaw;
            var len = Math.sqrt(off.x*off.x + off.z*off.z);
            camTarget.set(
              r.camPos.x + Math.sin(ang) * len + parX,
              r.camTarget.y + roomPitch * 3 + parY,
              r.camPos.z + Math.cos(ang) * len
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
          renderer.render(scene, camera);
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
            disposed = true;
            if (rafId) cancelAnimationFrame(rafId);
            try { renderer.dispose(); } catch (e) { /* noop */ }
            if (renderer.domElement && renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement);
          }
        };
      }


  /* initial location for the dot nav: the hall */
  if (opts && opts.onLocation) opts.onLocation(null);
  /* Build marker (round 12): lets a visual check confirm which build is
     actually loaded, so a stale-cache check can never again be mistaken
     for a failed fix. */
  if (typeof window !== 'undefined') window.__GALLERY_BUILD = 'r12';
  var sceneEl = document.getElementById('scene');
  if (sceneEl) sceneEl.dataset.build = 'r12';
  return gl;
}

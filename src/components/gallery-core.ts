// Ported verbatim from the proven static gallery (portfolio export, fixed 22 Nov 2026).
// Only adaptations: PROJECTS comes in as a parameter, THREE is an npm import,
// and a dispose() was added for React unmount. No visual or behaviour changes.
// @ts-nocheck
import * as THREE from 'three';
import type { Project } from '../lib/projects';

export type GalleryApi = {
  enterRoom: (id: string) => void;
  leaveRoom: () => void;
  isInRoom: () => boolean;
  currentRoomId: () => string | null;
  nudgeYaw: (d: number) => void;
  dispose: () => void;
};

export function startGallery(projects: Project[]): GalleryApi {
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
      backBtn.addEventListener('click', leaveRoom);
      document.getElementById('brand').addEventListener('click', function(){
        closeMenu(); closeDetail(); if (gl && gl.isInRoom()) gl.leaveRoom();
      });

      /* menu */
      var cardsEl = document.getElementById('cards');
      PROJECTS.forEach(function(p){
        var b = document.createElement('button');
        b.type = 'button'; b.className = 'card';
        b.innerHTML =
          '<img src="' + p.art + '" alt="Lukisan dunia ' + p.name + '" loading="lazy" />' +
          '<span class="card-body">' +
            '<span class="card-top"><h3>' + p.name + '</h3>' +
            '<span class="status' + (p.live ? ' live' : '') + '">' + p.status + '</span></span>' +
            '<p>' + p.desc + '</p>' +
            '<span class="go">Masuk ke dunianya →</span>' +
          '</span>';
        b.addEventListener('click', function(){ enterRoom(p.id); });
        cardsEl.appendChild(b);
      });
      function openMenu(){ menuSheet.classList.add('open'); menuSheet.scrollTop = 0; }
      function closeMenu(){ menuSheet.classList.remove('open'); }
      document.getElementById('menuBtn').addEventListener('click', openMenu);
      document.getElementById('menuClose').addEventListener('click', closeMenu);

      /* detail */
      function openDetail(id){
        var p = byId(id); if (!p) return;
        document.getElementById('dImg').src = p.art;
        document.getElementById('dImg').alt = 'Lukisan dunia ' + p.name;
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
          if (detailSheet.classList.contains('open')) closeDetail();
          else if (menuSheet.classList.contains('open')) closeMenu();
          else if (gl && gl.isInRoom()) gl.leaveRoom();
        }
        if (menuSheet.classList.contains('open') || detailSheet.classList.contains('open')) return;
        if (!gl) return;
        if (e.key === 'ArrowLeft') gl.nudgeYaw(-0.3);
        if (e.key === 'ArrowRight') gl.nudgeYaw(0.3);
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
      /* granite-ish speckle for the stone knot: flat colour read as plastic */
      var stoneTex = (function(){
        var c = document.createElement('canvas'); c.width = c.height = 256;
        var g = c.getContext('2d');
        g.fillStyle = '#b3a184'; g.fillRect(0, 0, 256, 256);
        for (var i = 0; i < 2600; i++){
          var v = Math.random();
          g.fillStyle = v < 0.5 ? 'rgba(70,58,40,' + (0.08 + Math.random()*0.16) + ')'
                                : 'rgba(235,225,200,' + (0.08 + Math.random()*0.14) + ')';
          g.fillRect(Math.random()*256, Math.random()*256, 1 + Math.random()*2.2, 1 + Math.random()*2.2);
        }
        for (var j = 0; j < 9; j++){
          g.strokeStyle = 'rgba(80,66,44,' + (0.1 + Math.random()*0.12) + ')';
          g.lineWidth = 1 + Math.random();
          g.beginPath();
          var sx = Math.random()*256, sy = Math.random()*256;
          g.moveTo(sx, sy);
          g.bezierCurveTo(sx + 40, sy + (Math.random()*40-20), sx + 90, sy + (Math.random()*40-20), sx + 140, sy + (Math.random()*30-15));
          g.stroke();
        }
        var t = new THREE.CanvasTexture(c);
        t.colorSpace = THREE.SRGBColorSpace;
        t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(2, 2);
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
      function contactShadow(x, y, z, r, parent){
        var m = new THREE.Mesh(new THREE.PlaneGeometry(r*2, r*2),
          new THREE.MeshBasicMaterial({ map: contactTex, transparent:true, depthWrite:false }));
        m.rotation.x = -Math.PI/2; m.position.set(x, y, z); parent.add(m);
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
        stone: new THREE.MeshStandardMaterial({ color:0x9a958a, roughness:.9 }),
        plinth: new THREE.MeshStandardMaterial({ color:0x55534e, roughness:.85 }),
        paper: new THREE.MeshStandardMaterial({ color:0xf6f1e3, roughness:.9 })
      };

      var clickables = [];
      function markClickable(obj, data){ obj.traverse(function(o){ if (o.isMesh){ o.userData.hit = data; clickables.push(o); } }); }

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
      contactShadow(0, 0.006, 0, 1.5, hall);
      var knot = new THREE.Mesh(new THREE.TorusKnotGeometry(0.34, 0.12, 120, 16),
        new THREE.MeshStandardMaterial({ map:stoneTex, bumpMap:stoneTex, bumpScale:0.6, roughness:.85 }));
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
        var rFloor = new THREE.Mesh(new THREE.PlaneGeometry(RW, RD), MAT.woodFloor);
        rFloor.rotation.x = -Math.PI/2; rFloor.receiveShadow = true; room.add(rFloor);
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
        contactShadow(0, 0.006, -0.4, 1.7, room);
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
      var yaw = 0.12, pitch = 0.10, targetYaw = 0.12, targetPitch = 0.10;
      var roomYaw = 0, roomPitch = 0, tRoomYaw = 0, tRoomPitch = 0;
      var camPos = new THREE.Vector3(0, 1.9, 3.1), camTarget = new THREE.Vector3();
      var transit = null;
      var lastInteract = performance.now();
      var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      function ease(t){ return t < .5 ? 4*t*t*t : 1 - Math.pow(-2*t + 2, 3)/2; }
      function flyTo(pos, tgt, dur, done){
        transit = { t:0, dur:dur, fromP:camPos.clone(), fromT:camTarget.clone(),
                    toP:pos.clone(), toT:tgt.clone(), done:done };
        mode = 'transit';
      }
      function hallView(){
        var base = new THREE.Vector3(0, 1.9, 3.1);
        var d = new THREE.Vector3(Math.sin(yaw)*Math.cos(pitch), Math.sin(pitch), -Math.cos(yaw)*Math.cos(pitch));
        return { pos:base, tgt:d.multiplyScalar(10).add(base) };
      }

      function enterRoom(id){
        var p = byId(id), r = rooms[id];
        if (!p || !r || mode === 'transit') return;
        closeMenu();
        roomTitleText.textContent = p.world;
        roomTitle.classList.add('show');
        enterLabel.textContent = 'Jelajahi ' + p.name;
        actionBar.classList.add('show');
        backBtn.classList.add('show');
        hint.classList.add('hide');
        flyTo(r.camPos, r.camTarget, reduced ? 0.4 : 1.9, function(){
          mode = 'room'; currentRoom = id;
          tRoomYaw = 0; tRoomPitch = 0; roomYaw = 0; roomPitch = 0;
        });
      }
      function leaveRoom(){
        if (mode !== 'room') return;
        var v = hallView();
        roomTitle.classList.remove('show');
        actionBar.classList.remove('show');
        backBtn.classList.remove('show');
        flyTo(v.pos, v.tgt, reduced ? 0.4 : 1.7, function(){ mode = 'hall'; currentRoom = null; });
      }
      /* ================= POINTER: drag-look + click ================= */
      var dragging = false, moved = 0, lastX = 0, lastY = 0;
      var raycaster = new THREE.Raycaster();
      var ndc = new THREE.Vector2();
      var el = renderer.domElement;

      el.addEventListener('pointerdown', function(e){
        dragging = true; moved = 0; lastX = e.clientX; lastY = e.clientY;
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
          /* hover cursor */
          ndc.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
          raycaster.setFromCamera(ndc, camera);
          var hits = raycaster.intersectObjects(clickables, false);
          el.style.cursor = hits.length ? 'pointer' : 'grab';
        }
      });
      el.addEventListener('pointerup', function(e){
        var wasDrag = moved > 7;
        dragging = false;
        if (wasDrag || mode === 'transit') return;
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
            transit.t += dt / transit.dur;
            var k = ease(Math.min(transit.t, 1));
            camPos.lerpVectors(transit.fromP, transit.toP, k);
            camPos.y += Math.sin(k * Math.PI) * 0.25;
            camTarget.lerpVectors(transit.fromT, transit.toT, k);
            if (transit.t >= 1){ var done = transit.done; transit = null; done && done(); }
          } else if (mode === 'hall'){
            if (!dragging && !reduced && performance.now() - lastInteract > 5000) targetYaw += dt * 0.03;
            yaw += (targetYaw - yaw) * Math.min(1, dt * 5);
            pitch += (targetPitch - pitch) * Math.min(1, dt * 5);
            var v = hallView();
            camPos.copy(v.pos); camTarget.copy(v.tgt);
            camPos.y = 1.9 + Math.sin(t * 0.5) * (reduced ? 0 : 0.03);
          } else if (mode === 'room' && currentRoom){
            var r = rooms[currentRoom];
            roomYaw += (tRoomYaw - roomYaw) * Math.min(1, dt * 5);
            roomPitch += (tRoomPitch - roomPitch) * Math.min(1, dt * 5);
            camPos.copy(r.camPos);
            var off = r.camTarget.clone().sub(r.camPos);
            var ang = Math.atan2(off.x, off.z) + roomYaw;
            var len = Math.sqrt(off.x*off.x + off.z*off.z);
            camTarget.set(
              r.camPos.x + Math.sin(ang) * len,
              r.camTarget.y + roomPitch * 3,
              r.camPos.z + Math.cos(ang) * len
            );
          }
          camera.position.copy(camPos);
          camera.lookAt(camTarget);
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
          isInRoom: function(){ return mode === 'room'; },
          currentRoomId: function(){ return currentRoom; },
          nudgeYaw: function(d){ targetYaw += d; lastInteract = performance.now(); },
          dispose: function(){
            disposed = true;
            if (rafId) cancelAnimationFrame(rafId);
            try { renderer.dispose(); } catch (e) { /* noop */ }
            if (renderer.domElement && renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement);
          }
        };
      }


  return gl;
}

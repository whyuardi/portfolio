'use client';

import { useEffect } from 'react';
import { PROJECTS } from '@/lib/projects';
import { startGallery } from './gallery-core';

export default function Gallery() {
  useEffect(() => {
    const api = startGallery(PROJECTS);
    return () => {
      api?.dispose();
    };
  }, []);

  return (
    <>
      <div id="scene" aria-label="Galeri 3D portofolio" />

      <button id="brand" className="chrome" type="button">
        Ardhiansyah<small>Portfolio · Yogyakarta</small>
      </button>
      <button id="menuBtn" className="chrome" type="button" aria-haspopup="true">
        Menu{' '}
        <span className="dots">
          <i />
          <i />
          <i />
          <i />
        </span>
      </button>
      <button id="backBtn" className="chrome" type="button">
        ← Kembali
      </button>
      <div id="foot" className="chrome">
        © 2026 Ardhiansyah Wahyu Setyadi
      </div>

      <div id="roomTitle" aria-hidden="true">
        <h2 id="roomTitleText" />
      </div>

      <div id="hint">Seret untuk melihat sekeliling — klik pintu lengkung untuk membuka proyek</div>
      <div id="actionBar">
        <button id="enterBtn" type="button">
          <span id="enterLabel">Jelajahi</span>
          <span className="arr">→</span>
        </button>
      </div>

      {/* ======= MENU ======= */}
      <div id="menu" className="sheet" role="dialog" aria-label="Menu proyek">
        <div className="sheet-inner">
          <div className="sheet-head">
            <div>
              <p className="kicker">Daftar Proyek</p>
              <h2>Tiga proyek, tiga cerita.</h2>
            </div>
            <button className="closeBtn" id="menuClose" type="button" aria-label="Tutup menu">
              ✕
            </button>
          </div>
          <div className="cards" id="cards" />

          <div className="about">
            <div>
              <p className="kicker">Tentang</p>
              <h3>Ardhiansyah Wahyu Setyadi</h3>
              <p>
                Mobile developer lulusan S1 Teknik Informatika, Universitas Teknologi Yogyakarta (IPK
                3,69). Alumnus Bangkit Academy jalur Mobile Development, pernah menjadi asisten dosen
                akreditasi dan IT support, serta tersertifikasi Junior Network Administrator (BNSP).
              </p>
              <p>
                Fokusnya sederhana: aplikasi yang tenang dipakai — alur jelas, beban ringan, dan
                masalah nyata selesai.
              </p>
            </div>
            <div>
              <p className="kicker">Keahlian</p>
              <div className="chips">
                <span>Kotlin · Android</span>
                <span>Flutter · Dart</span>
                <span>React.js</span>
                <span>Python</span>
                <span>REST API</span>
                <span>Firebase</span>
                <span>MySQL</span>
                <span>TensorFlow Lite</span>
                <span>Gemini API</span>
              </div>
              <p className="kicker" style={{ marginTop: '1.8rem' }}>
                Kontak
              </p>
              <div className="links">
                <a href="https://github.com/whyuardi" target="_blank" rel="noopener">
                  GitHub — whyuardi <span>→</span>
                </a>
                <a href="mailto:whyuardi17@gmail.com">
                  whyuardi17@gmail.com <span>→</span>
                </a>
                <a href="https://rolling-libur.vercel.app" target="_blank" rel="noopener">
                  Rolling Libur — situs live <span>→</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ======= PROJECT DETAIL ======= */}
      <div id="detail" className="sheet" role="dialog" aria-label="Detail proyek">
        <div className="hero">
          <button id="detailClose" type="button" aria-label="Tutup detail">
            ✕
          </button>
          <img id="dImg" alt="" />
          <div className="hero-txt">
            <h2 id="dTitle" />
            <div className="tag" id="dTag" />
          </div>
        </div>
        <div className="story" id="dStory" />
        <div className="specwrap">
          <dl className="spec" id="dSpec" />
          <div className="cta-row" id="dCtas" />
        </div>
      </div>

      <div id="errBox" role="alert" />
      <div id="fade" />
    </>
  );
}

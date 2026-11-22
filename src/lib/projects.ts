export type ProjectCta = { label: string; href: string; primary: boolean };
export type Project = {
  id: string; name: string; world: string; tag: string; desc: string;
  status: string; live: boolean; art: string;
  wall: number; accent: number; glow: number; angle: number;
  story: { line: string; note: string }[];
  spec: [string, string][];
  ctas: ProjectCta[];
};

export const PROJECTS: Project[] = [
        {
          id:'siaprak', name:'Siaprak', world:'Dunia Siaprak',
          tag:'Administrasi desa, dari meja ke genggaman.',
          desc:'Aplikasi Android yang dibangun sepenuhnya dengan Kotlin. Proyek ini jadi bukti stack Android native saya: bukan webview, bukan hibrida — murni Android.',
          status:'Studi kasus', live:false,
          art:'/painting-1.webp',
          wall:0xdfe3d2, accent:0xb97c26, glow:0xffd9a0,
          angle:-0.95,
          story:[
            { line:'Surat-menyurat desa masih berpindah dari meja ke meja.', note:'Warga datang, mengantre, lalu kembali lagi hanya untuk menanyakan satu lembar surat.' },
            { line:'Siaprak memindahkannya ke satu genggaman.', note:'Pengajuan dibuat dari ponsel, perangkat desa memprosesnya dari antrean yang sama — tanpa kertas yang hilang di tengah jalan.' },
            { line:'Yang tersisa hanya arsip yang rapi.', note:'Setiap surat tercatat dan bisa dilacak statusnya, dari diajukan sampai selesai.' }
          ],
          spec:[
            ['Platform','Android'],['Bahasa','Kotlin'],['Peran','Mobile Developer'],
            ['Fokus','Alur persuratan & arsip digital desa'],['Status','Studi kasus']
          ],
          ctas:[]
        },
        {
          id:'gemfund', name:'Gemfund', world:'Dunia Gemfund',
          tag:'Dana bersama, mengalir seperti air tenang.',
          desc:'Aplikasi mobile lintas platform yang dibangun dengan Flutter dan Dart — satu basis kode untuk Android dan iOS, dengan pengalaman yang tetap terasa native di keduanya.',
          status:'Studi kasus', live:false,
          art:'/painting-2.webp',
          wall:0xd7e2e0, accent:0x0e6b62, glow:0x9fe8d8,
          angle:0,
          story:[
            { line:'Niat baik sering berhenti karena tidak tahu harus mulai dari mana.', note:'Satu orang hanya bisa memberi sedikit — tetapi sedikit dari banyak orang adalah cerita yang berbeda.' },
            { line:'Gemfund mempertemukan niat itu dengan banyak tangan.', note:'Kampanye dibuka, kontribusi mengalir masuk, dan setiap rupiah tercatat jelas pergerakannya.' },
            { line:'Kepercayaan tumbuh dari yang terlihat.', note:'Perkembangan kampanye bisa diikuti siapa pun, kapan pun — transparan seperti permukaan air yang jernih.' }
          ],
          spec:[
            ['Platform','Android'],['Framework','Flutter'],['Bahasa','Dart'],
            ['Peran','Mobile Developer'],['Fokus','Kampanye & kontribusi bersama'],['Status','Studi kasus']
          ],
          ctas:[]
        },
        {
          id:'rolling', name:'Rolling Libur', world:'Dunia Rolling Libur',
          tag:'Satu hari libur, bergantian dengan adil.',
          desc:'Web satu halaman untuk 14 peserta MagangHub di PT Ethes Teknologi Makmur: tiap orang memilih libur Jumat atau Sabtu, bergantian tiap minggu, dengan aturan selang-seling yang dijaga sistem. Sudah live dan dipakai kohort.',
          status:'Live', live:true,
          art:'/painting-3.webp',
          wall:0xe0e4d3, accent:0x75855a, glow:0xe6efc8,
          angle:0.95,
          story:[
            { line:'Empat belas orang, satu hari libur yang harus dibagi.', note:'Setiap peserta berhak atas Jumat atau Sabtu — tetapi tidak bisa dua-duanya, dan tidak boleh sama terus setiap minggu.' },
            { line:'Rolling Libur menjaga gilirannya tetap adil.', note:'Pilihan minggu lalu mengunci pola minggu ini: siapa yang libur Jumat kemarin, bergeser. Hari yang terkunci tidak bisa dipilih, sisanya bebas diganti atau dibatalkan.' },
            { line:'Tidak ada lagi tanya “minggu ini siapa?”', note:'Satu halaman, semua orang melihat jadwal yang sama — dipakai 14 peserta MagangHub di PT Ethes Teknologi Makmur.' }
          ],
          spec:[
            ['Platform','Web'],['Stack','Next.js · Tailwind CSS'],['Pengguna','14 peserta MagangHub'],
            ['Peran','Pengembang'],['Status','Live']
          ],
          ctas:[
            { label:'Kunjungi situs live', href:'https://rolling-libur.vercel.app', primary:true },
            { label:'Kode di GitHub', href:'https://github.com/whyuardi/rollingLibur', primary:false }
          ]
        }
];

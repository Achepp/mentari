import { FeedbackSession } from "./types";

export const SAMPLE_SCENARIOS: FeedbackSession[] = [
  {
    id: "sample_1",
    title: "Data Mining di Dunia Bisnis",
    date: "2026-06-16T14:30:00Z",
    topic: "Jelaskan manfaat Data Mining dalam dunia bisnis serta berikan contoh konkret penerapannya.",
    style: "formal",
    responses: [
      {
        id: "r1",
        name: "Ahmad",
        content: "Data mining sangat penting untuk menemukan pola tersembunyi dari transaksi konsumen. Contohnya seperti supermarket yang bisa tahu produk apa saja yang sering dibeli bersamaan, sehingga peletakan barang seperti bumbu dapur diletakkan dekat dengan daging segar untuk memicu cross-selling.",
        status: "idle",
        wordCount: 41,
        sentiment: "Positif",
        completenessScore: 85
      },
      {
        id: "r2",
        name: "Budi Santoso",
        content: "Menurut saya, data mining membantu efisiensi operasional perusahaan dengan memprediksi kebutuhan stok barang di masa depan. Perusahaan retail dapat menghemat biaya gudang karena pasokan barang disesuaikan dengan perkiraan penjualan bulanan yang didasarkan pada data historis.",
        status: "idle",
        wordCount: 39,
        sentiment: "Positif",
        completenessScore: 78
      },
      {
        id: "r3",
        name: "Cici Amalia",
        content: "Manfaat utama dari data mining adalah kemampuannya dalam melakukan segmentasi pelanggan (customer segmentation). Dengan mengelompokkan pelanggan berdasarkan kebiasaan berbelanja, divisi pemasaran bisa membuat promosi yang sangat personal dan relevan, sehingga menghemat biaya marketing.",
        status: "idle",
        wordCount: 38,
        sentiment: "Positif",
        completenessScore: 90
      }
    ]
  },
  {
    id: "sample_2",
    title: "Agile Scrum di Tim Startup",
    date: "2026-06-15T09:12:00Z",
    topic: "Diskusikan mengapa framework Agile Scrum dinilai lebih efektif dibandingkan metode Waterfall tradisional bagi perusahaan rintisan (startup).",
    style: "motivatif",
    responses: [
      {
        id: "r4",
        name: "Dedi Wijaya",
        content: "Startup butuh fleksibilitas tinggi karena pasarnya belum stabil. Agile Scrum membagi pengerjaan menjadi sprint pendek (biasanya 2 minggu). Di setiap akhir sprint, tim bisa adaptasi dan pivot dengan cepat jika ternyata produk atau fitur yang dirilis kurang diminati pengguna.",
        status: "idle",
        wordCount: 44,
        sentiment: "Positif",
        completenessScore: 82
      },
      {
        id: "r5",
        name: "Elga Rahmawati",
        content: "Waterfall terlalu kaku dan lama. Kita harus menunggu berbulan-bulan sampai seluruh desain selesai baru masuk tahap coding. Di startup, waktu berbulan-bulan itu bisa membuat kita kehilangan momentum kompetitif. Scrum membuat tim bisa rilis Minimal Viable Product (MVP) dengan cepat.",
        status: "idle",
        wordCount: 42,
        sentiment: "Netral",
        completenessScore: 75
      },
      {
        id: "r6",
        name: "Fahmi Irawan",
        content: "Menurut saya kolaborasi harian seperti Daily Standup adalah kunci utama Scrum. Ini membuat tim tahu hambatan satu sama lain secara langsung tanpa menunggu rapat panjang mingguan. Hambatan kerja dapat langsung diselesaikan hari itu juga.",
        status: "idle",
        wordCount: 37,
        sentiment: "Positif",
        completenessScore: 88
      }
    ]
  },
  {
    id: "sample_3",
    title: "Keamanan Data E-Commerce",
    date: "2026-06-12T10:05:00Z",
    topic: "Bagaimana cara terbaik bagi platform e-commerce kecil untuk menjaga kerahasiaan data pengguna dari ancaman kebocoran data di era siber saat ini?",
    style: "kritis",
    responses: [
      {
        id: "r7",
        name: "Gita Lestari",
        content: "Cara terbaik adalah menerapkan enkripsi end-to-end pada database pengguna, terutama bagian password dan detail kartu pembayaran. Jika data sampai bocor, peretas tidak akan bisa membacanya tanpa kunci enkripsi khusus.",
        status: "idle",
        wordCount: 34,
        sentiment: "Positif",
        completenessScore: 80
      },
      {
        id: "r8",
        name: "Hendra Wijaya",
        content: "Bisa menggunakan layanan payment gateway pihak ketiga terpercaya daripada menyimpan data nomor kartu kredit langsung di server kita sendiri. Ini mengurangi beban lisensi PCI-DSS dan meminimalkan kerentanan server e-commerce lokal kita.",
        status: "idle",
        wordCount: 37,
        sentiment: "Positif",
        completenessScore: 92
      }
    ]
  }
];

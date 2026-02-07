const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const session = require('express-session');
const path = require('path');

const app = express();
const PORT = 3000;

// Koneksi MongoDB (ganti URL dengan database Anda)
mongoose.connect('mongodb://localhost:27017/messageSystemDB')
  .then(() => console.log('Terhubung ke MongoDB'))
  .catch(err => console.error('Gagal koneksi MongoDB:', err));

// Schema & Model
// Model Pesan
const PesanSchema = new mongoose.Schema({
  namaPengguna: String,
  isiPesan: String,
  masukkanAdmin: { type: String, default: "" },
  tanggalKirim: { type: Date, default: Date.now }
});
const Pesan = mongoose.model('Pesan', PesanSchema);

// Model Admin
const AdminSchema = new mongoose.Schema({
  username: { type: String, unique: true, required: true },
  password: { type: String, required: true }
});
const Admin = mongoose.model('Admin', AdminSchema);

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(session({
  secret: 'rahasia-admin-sistem-pesan',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false } // Ganti jadi true jika menggunakan HTTPS
}));

// Fungsi cek apakah admin sudah login
const cekAdminLogin = (req, res, next) => {
  if (req.session.adminLoggedIn) {
    next();
  } else {
    res.redirect('/pesanadmin.html'); // Kembali ke halaman login
  }
};

// API Endpoint
// 1. Tambah admin awal (jalankan sekali saja, lalu hapus atau komentari)
app.get('/buat-admin', async (req, res) => {
  const passwordHash = await bcrypt.hash('admin123', 10); // Password default: admin123
  const adminBaru = new Admin({ username: 'admin', password: passwordHash });
  await adminBaru.save();
  res.send('Admin berhasil dibuat! Username: admin, Password: admin123');
});

// 2. Login admin
app.post('/api/admin/login', async (req, res) => {
  const { username, password } = req.body;
  const admin = await Admin.findOne({ username });
  
  if (!admin) {
    return res.json({ sukses: false, pesan: 'Username tidak ditemukan' });
  }

  const passwordBenar = await bcrypt.compare(password, admin.password);
  if (passwordBenar) {
    req.session.adminLoggedIn = true;
    return res.json({ sukses: true, pesan: 'Login berhasil' });
  } else {
    return res.json({ sukses: false, pesan: 'Password salah' });
  }
});

// 3. Logout admin
app.get('/api/admin/logout', (req, res) => {
  req.session.destroy();
  res.json({ sukses: true, pesan: 'Logout berhasil' });
});

// 4. Kirim pesan dari pengguna
app.post('/api/pesan/kirim', async (req, res) => {
  const { namaPengguna, isiPesan } = req.body;
  if (!namaPengguna || !isiPesan) {
    return res.json({ sukses: false, pesan: 'Nama dan pesan harus diisi' });
  }
  const pesanBaru = new Pesan({ namaPengguna, isiPesan });
  await pesanBaru.save();
  res.json({ sukses: true, pesan: 'Pesan berhasil dikirim' });
});

// 5. Ambil semua pesan (hanya untuk admin yang sudah login)
app.get('/api/pesan/semua', cekAdminLogin, async (req, res) => {
  const semuaPesan = await Pesan.find().sort({ tanggalKirim: -1 });
  res.json(semuaPesan);
});

// 6. Simpan masukkan admin
app.post('/api/pesan/masukkan', cekAdminLogin, async (req, res) => {
  const { idPesan, masukkan } = req.body;
  await Pesan.findByIdAndUpdate(idPesan, { masukkanAdmin: masukkan });
  res.json({ sukses: true, pesan: 'Masukkan berhasil disimpan' });
});

// Jalankan server
app.listen(PORT, () => {
  console.log(`Server berjalan di http://localhost:${PORT}`);
});

## Deploy `yn-project-manager` ke VPS Ubuntu + Nginx (Custom Domain)

Dokumentasi ini menjelaskan cara deploy full stack app ini (Node.js `server` + Next.js `client`) ke VPS Ubuntu menggunakan Nginx sebagai reverse proxy dan domain kamu sendiri (dengan HTTPS).

> **Catatan**  
> - Contoh ini memakai:
>   - **Domain**: `yourdomain.com` (ganti dengan domain kamu)  
>   - **Server (API)**: port `4000`  
>   - **Client (Next.js)**: port `3000`  
> - Kalau kamu pakai port lain, sesuaikan saja di langkah-langkahnya.

---

## 1. Prasyarat

- **VPS** dengan Ubuntu 20.04/22.04 (akses root atau sudo).  
- **Domain** sudah mengarah ke IP VPS:
  - Tambah A record di DNS:
    - Host: `@` → IP VPS
    - (Opsional) `www` → IP VPS
- Akses SSH ke VPS:

```bash
ssh ubuntu@YOUR_SERVER_IP
```

---

## 2. Install Dependensi di VPS

Jalankan perintah berikut di VPS.

### 2.1. Update paket

```bash
sudo apt update && sudo apt upgrade -y
```

### 2.2. Install Node.js (LTS) + npm

```bash
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt install -y nodejs build-essential

node -v
npm -v
```

### 2.3. Install Git

```bash
sudo apt install -y git
```

### 2.4. Install Nginx

```bash
sudo apt install -y nginx
sudo systemctl enable nginx
sudo systemctl start nginx
```

### 2.5. (Disarankan) Install PM2 untuk menjalankan Node.js sebagai service

```bash
sudo npm install -g pm2

pm2 -v
```

---

## 3. Clone Project ke VPS

Masuk ke direktori di mana kamu ingin menyimpan project (misal `/var/www`):

```bash
cd /var/www
sudo mkdir project-manager
sudo chown $USER:$USER project-manager
cd project-manager
```

Clone repo (ganti URL repo dengan milikmu):

```bash
git clone https://github.com/USERNAME/REPO.git .
```

---

## 4. Setup Backend `server`

Masuk ke folder `server` dan install dependency:

```bash
cd server
npm install
```

Buat file `.env` sesuai kebutuhan backend (contoh, sesuaikan dengan setting asli project-mu):

```bash
nano .env
```

Contoh isi minimal (silakan tambah variabel lain yang dibutuhkan backend kamu):

```bash
PORT=4000
MONGODB_URI=mongodb+srv://...
JWT_SECRET=your_jwt_secret
NODE_ENV=production
CLIENT_URL=https://yourdomain.com
```

Simpan dan keluar.

### 4.1. Jalankan backend dengan PM2

Masih di folder `server`:

```bash
pm2 start index.js --name yn-pm-server
pm2 save
pm2 startup
```

Perintah `pm2 startup` akan menampilkan command; jalankan command tersebut supaya PM2 auto-start saat reboot.

Cek status:

```bash
pm2 status
```

Pastikan backend berjalan di port `4000` (atau port yang kamu set).

---

## 5. Setup Frontend `client` (Next.js)

### 5.1. Install dependency dan build

```bash
cd /var/www/project-manager/client
npm install
npm run build
```

### 5.2. Jalankan Next.js (production) dengan PM2

```bash
pm2 start "npm start" --name yn-pm-client
pm2 save
```

Secara default, `next start` akan jalan di port `3000`.  
Kalau kamu ingin pakai port lain:

```bash
PORT=3001 pm2 start "npm start" --name yn-pm-client
```

---

## 6. Konfigurasi Nginx sebagai Reverse Proxy

Tujuan:  
- `https://yourdomain.com` → ke Next.js client (port `3000`)  
- (Opsional) `https://api.yourdomain.com` → ke backend API (port `4000`)

### 6.1. Buat server block Nginx untuk domain utama

```bash
sudo nano /etc/nginx/sites-available/yourdomain.com
```

Isi dengan konfigurasi dasar HTTP terlebih dahulu (nanti kita tambah HTTPS via Certbot):

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name yourdomain.com www.yourdomain.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Simpan dan keluar.

Aktifkan site:

```bash
sudo ln -s /etc/nginx/sites-available/yourdomain.com /etc/nginx/sites-enabled/
```

Nonaktifkan default site (opsional tapi disarankan):

```bash
sudo rm /etc/nginx/sites-enabled/default
```

Test konfigurasi:

```bash
sudo nginx -t
```

Kalau OK, reload:

```bash
sudo systemctl reload nginx
```

Sekarang akses `http://yourdomain.com` → harusnya muncul app Next.js production.

### 6.2. (Opsional) Server block untuk subdomain API

Kalau kamu ingin akses backend lewat subdomain `api.yourdomain.com`, buat record DNS `api` → IP VPS, lalu:

```bash
sudo nano /etc/nginx/sites-available/api.yourdomain.com
```

Isi:

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Aktifkan:

```bash
sudo ln -s /etc/nginx/sites-available/api.yourdomain.com /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

Sesuaikan `CLIENT_URL` dan konfigurasi CORS backend agar mengizinkan domain ini.

---

## 7. Pasang HTTPS dengan Let’s Encrypt (Certbot)

Install Certbot plugin Nginx:

```bash
sudo apt install -y certbot python3-certbot-nginx
```

### 7.1. HTTPS untuk domain utama

```bash
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

Ikuti wizard:
- Pilih email
- Setuju ToS
- Pilih redirect HTTP → HTTPS (disarankan)

### 7.2. (Opsional) HTTPS untuk API subdomain

```bash
sudo certbot --nginx -d api.yourdomain.com
```

Certbot otomatis menambahkan konfigurasi SSL ke file Nginx yang tadi kita buat.

Auto-renew sudah diset oleh Certbot. Kamu bisa test:

```bash
sudo certbot renew --dry-run
```

---

## 8. Update Config Client/Server untuk URL Production

Pastikan:

- File `.env` di `server` pakai URL production yang benar, misalnya:

```bash
CLIENT_URL=https://yourdomain.com
API_BASE_URL=https://api.yourdomain.com
```

- Di `client`, kalau kamu punya config environment (`.env.production` atau variabel `NEXT_PUBLIC_*`), sesuaikan:

```bash
nano .env.production
```

Contoh:

```bash
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
```

Setelah mengubah env client:

```bash
cd /var/www/project-manager/client
npm run build
pm2 restart yn-pm-client
```

---

## 9. Operasional Sehari-hari

Beberapa command yang sering dipakai di VPS:

- **Cek status service**:

```bash
pm2 status
```

- **Lihat log**:

```bash
pm2 logs yn-pm-server
pm2 logs yn-pm-client
```

- **Restart service setelah update kode**:

```bash
cd /var/www/project-manager
git pull

cd server
npm install        # kalau ada dependency baru
pm2 restart yn-pm-server

cd ../client
npm install        # kalau ada dependency baru
npm run build
pm2 restart yn-pm-client
```

- **Restart Nginx**:

```bash
sudo systemctl reload nginx
```

---

## 10. Ringkasan Alur Deploy

1. Siapkan VPS Ubuntu + domain mengarah ke IP VPS.  
2. Install Node.js, Git, Nginx, PM2, Certbot.  
3. Clone repo ke VPS dan isi `.env` untuk backend (dan client bila perlu).  
4. Jalankan backend (`server`) dengan PM2 di port `4000`.  
5. Build dan jalankan frontend (`client`) dengan PM2 di port `3000`.  
6. Konfigurasi Nginx sebagai reverse proxy ke port tersebut.  
7. Aktifkan HTTPS dengan Certbot untuk domain kamu.  
8. Sesuaikan env URL production di client/server, rebuild client kalau perlu.  

Kalau kamu mau, kamu bisa kirim isi `.env.example` (kalau ada) atau struktur konfigurasi kamu, dan panduan ini bisa disesuaikan lebih spesifik lagi untuk setup project-mu.


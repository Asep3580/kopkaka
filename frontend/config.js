 // File: config.js
 
 // Variabel ini akan diganti oleh Vercel saat proses build.
 // Pastikan nama variabelnya sama persis dengan yang ada di Vercel (case-sensitive).
 const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
 
 // Export variabel agar bisa diimpor di file lain

 export { API_URL };




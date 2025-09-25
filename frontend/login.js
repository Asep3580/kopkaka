document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('login-form');
    const errorMessage = document.getElementById('error-message');
    const API_URL = 'https://kopkaka.onrender.com/api'; 

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        errorMessage.classList.add('hidden');
        errorMessage.textContent = '';

        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        try {
            const response = await fetch(`${API_URL}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Login gagal. Periksa kembali email dan password Anda.');
            }

            // Simpan token dan data pengguna di localStorage
            localStorage.setItem('token', data.token);
            localStorage.setItem('user_name', data.user.name);
            localStorage.setItem('user_role', data.user.role);

            // Arahkan berdasarkan peran
            if (data.user.role === 'member') {
                window.location.href = 'anggota.html';
            } else if (['admin', 'akunting', 'manager'].includes(data.user.role)) {
                window.location.href = 'admin.html';
            } else {
                // Fallback jika ada peran lain
                window.location.href = 'index.html';
            }

        } catch (error) {
            errorMessage.textContent = error.message;
            errorMessage.classList.remove('hidden');
            console.error('Login error:', error);
        }
    });

});

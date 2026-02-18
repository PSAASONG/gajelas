// admin.js - Admin Panel Logic (FIXED)

let currentEditUserId = null;
let currentDeleteUserId = null;

// ========== INITIALIZATION ==========
document.addEventListener('DOMContentLoaded', async () => {
  console.log('Admin panel loaded');
  
  // Check if user is admin
  const currentUser = RoleManager.getCurrentUser();
  console.log('Current user:', currentUser);
  
  if (!currentUser || currentUser.role !== 'admin') {
    alert('Access denied! Admin only.');
    window.location.href = 'index.html';
    return;
  }
  
  // Load users
  await loadUsers();
  
  // Setup event listeners
  setupEventListeners();
});

// ========== LOAD USERS ==========
async function loadUsers() {
  try {
    // Make sure userManager exists
    if (!window.userManager) {
      console.error('userManager not found');
      return;
    }
    
    const users = await window.userManager.loadUsers();
    console.log('Loaded users:', users);
    renderUsers(users);
    updateStats(users);
  } catch (error) {
    console.error('Error loading users:', error);
    showToast('Gagal memuat data users', 'error');
  }
}

// ========== RENDER USERS TABLE ==========
function renderUsers(users) {
  const tbody = document.getElementById('users-tbody');
  
  if (!tbody) return;
  
  if (!users || users.length === 0) {
    tbody.innerHTML = `
      <tr class="loading-row">
        <td colspan="6">
          <div class="loading-spinner">
            <i class="fas fa-inbox"></i>
            <span>Belum ada user</span>
          </div>
        </td>
      </tr>
    `;
    return;
  }
  
  tbody.innerHTML = users.map(user => {
    const status = getUserStatus(user);
    const statusClass = status === 'Active' ? 'active' : 
                       status === 'Expired' ? 'expired' : 
                       status === 'Expiring Soon' ? 'expiring' : 'inactive';
    
    const createdDate = user.createdAt ? new Date(user.createdAt).toLocaleDateString('id-ID') : '-';
    const expiryDate = user.expiryDate ? new Date(user.expiryDate).toLocaleDateString('id-ID') : 'Tidak ada';
    
    return `
      <tr>
        <td><strong>${user.username || '-'}</strong></td>
        <td>
          <span class="role-badge ${user.role || 'user'}">${user.role || 'user'}</span>
        </td>
        <td>${createdDate}</td>
        <td>${expiryDate}</td>
        <td>
          <span class="status-badge ${statusClass}">${status}</span>
        </td>
        <td>
          <div class="action-btns">
            <button class="action-btn edit-btn" onclick="editUser('${user.id}')">
              <i class="fas fa-edit"></i>
              <span>Edit</span>
            </button>
            <button class="action-btn delete-btn" onclick="deleteUser('${user.id}')">
              <i class="fas fa-trash"></i>
              <span>Hapus</span>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

// ========== GET USER STATUS ==========
function getUserStatus(user) {
  if (!user) return 'Inactive';
  if (user.isActive === false) return 'Inactive';
  
  if (user.expiryDate) {
    const expiry = new Date(user.expiryDate);
    const now = new Date();
    const daysLeft = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
    
    if (daysLeft < 0) return 'Expired';
    if (daysLeft <= 7) return 'Expiring Soon';
  }
  
  return 'Active';
}

// ========== UPDATE STATS ==========
function updateStats(users) {
  const totalUsers = users.length;
  const totalAdmins = users.filter(u => u.role === 'admin').length;
  
  let expiringSoon = 0;
  let expired = 0;
  
  users.forEach(user => {
    if (user.expiryDate && user.isActive !== false) {
      const expiry = new Date(user.expiryDate);
      const now = new Date();
      const daysLeft = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
      
      if (daysLeft < 0) expired++;
      else if (daysLeft <= 7) expiringSoon++;
    }
  });
  
  const totalEl = document.getElementById('total-users');
  const adminsEl = document.getElementById('total-admins');
  const expiringEl = document.getElementById('expiring-soon');
  const expiredEl = document.getElementById('expired-users');
  
  if (totalEl) totalEl.textContent = totalUsers;
  if (adminsEl) adminsEl.textContent = totalAdmins;
  if (expiringEl) expiringEl.textContent = expiringSoon;
  if (expiredEl) expiredEl.textContent = expired;
}

// ========== SETUP EVENT LISTENERS ==========
function setupEventListeners() {
  console.log('Setting up event listeners');
  
  // Add user button
  const addBtn = document.getElementById('add-user-btn');
  if (addBtn) {
    addBtn.addEventListener('click', () => {
      currentEditUserId = null;
      openUserModal();
    });
  }
  
  // Refresh button
  const refreshBtn = document.getElementById('refresh-btn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', async () => {
      refreshBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i><span>Refreshing...</span>';
      await loadUsers();
      refreshBtn.innerHTML = '<i class="fas fa-sync-alt"></i><span>Refresh Data</span>';
      showToast('Data berhasil direfresh');
    });
  }
  
  // Search
  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      const searchTerm = e.target.value.toLowerCase();
      const users = window.userManager?.getAllUsers() || [];
      const filtered = users.filter(u => 
        (u.username && u.username.toLowerCase().includes(searchTerm)) ||
        (u.role && u.role.toLowerCase().includes(searchTerm))
      );
      renderUsers(filtered);
    });
  }
  
  // Modal close buttons
  const closeModal = document.getElementById('close-modal');
  const cancelBtn = document.getElementById('cancel-btn');
  const closeDeleteModal = document.getElementById('close-delete-modal');
  const cancelDeleteBtn = document.getElementById('cancel-delete-btn');
  
  if (closeModal) closeModal.addEventListener('click', closeUserModal);
  if (cancelBtn) cancelBtn.addEventListener('click', closeUserModal);
  if (closeDeleteModal) closeDeleteModal.addEventListener('click', closeDeleteModal);
  if (cancelDeleteBtn) cancelDeleteBtn.addEventListener('click', closeDeleteModal);
  
  // Form submit
  const userForm = document.getElementById('user-form');
  if (userForm) {
    userForm.addEventListener('submit', handleFormSubmit);
  }
  
  // Delete confirm
  const confirmDelete = document.getElementById('confirm-delete-btn');
  if (confirmDelete) {
    confirmDelete.addEventListener('click', handleDeleteConfirm);
  }
  
  // Logout
  const logoutBtn = document.getElementById('logout-btn-admin');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      if (confirm('Yakin ingin logout?')) {
        RoleManager.logout();
      }
    });
  }
  
  // Close modal on outside click
  const userModal = document.getElementById('user-modal');
  const deleteModal = document.getElementById('delete-modal');
  
  if (userModal) {
    userModal.addEventListener('click', (e) => {
      if (e.target.id === 'user-modal') closeUserModal();
    });
  }
  
  if (deleteModal) {
    deleteModal.addEventListener('click', (e) => {
      if (e.target.id === 'delete-modal') closeDeleteModal();
    });
  }
}

// ========== MODAL FUNCTIONS ==========
function openUserModal(userId = null) {
  const modal = document.getElementById('user-modal');
  const form = document.getElementById('user-form');
  const title = document.getElementById('modal-title');
  
  if (!modal || !form) return;
  
  form.reset();
  
  if (userId) {
    // Edit mode
    currentEditUserId = userId;
    const user = window.userManager?.getUserById(userId);
    
    if (user) {
      title.textContent = 'Edit User';
      document.getElementById('username').value = user.username || '';
      document.getElementById('password').value = user.password || '';
      document.getElementById('role').value = user.role || 'user';
      document.getElementById('is-active').checked = user.isActive !== false;
      
      if (user.expiryDate) {
        const date = new Date(user.expiryDate);
        const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
        document.getElementById('expiry-date').value = localDate.toISOString().slice(0, 16);
      }
    }
  } else {
    // Add mode
    title.textContent = 'Tambah User Baru';
    document.getElementById('is-active').checked = true;
  }
  
  modal.classList.add('active');
}

function closeUserModal() {
  const modal = document.getElementById('user-modal');
  if (modal) modal.classList.remove('active');
  currentEditUserId = null;
}

function closeDeleteModal() {
  const modal = document.getElementById('delete-modal');
  if (modal) modal.classList.remove('active');
  currentDeleteUserId = null;
}

// ========== FORM SUBMIT ==========
async function handleFormSubmit(e) {
  e.preventDefault();
  
  const userData = {
    username: document.getElementById('username')?.value.trim() || '',
    password: document.getElementById('password')?.value.trim() || '',
    role: document.getElementById('role')?.value || 'user',
    isActive: document.getElementById('is-active')?.checked || false,
    expiryDate: document.getElementById('expiry-date')?.value || null
  };
  
  try {
    if (!window.userManager) {
      throw new Error('UserManager not found');
    }
    
    if (currentEditUserId) {
      // Update existing user
      window.userManager.updateUser(currentEditUserId, userData);
      showToast('User berhasil diupdate');
    } else {
      // Add new user
      window.userManager.addUser(userData);
      showToast('User berhasil ditambahkan');
    }
    
    await window.userManager.saveUsers();
    await loadUsers();
    closeUserModal();
  } catch (error) {
    console.error('Error saving user:', error);
    showToast(error.message || 'Gagal menyimpan user', 'error');
  }
}

// ========== EDIT USER ==========
window.editUser = function(userId) {
  openUserModal(userId);
};

// ========== DELETE USER ==========
window.deleteUser = function(userId) {
  const user = window.userManager?.getUserById(userId);
  if (!user) return;
  
  currentDeleteUserId = userId;
  
  const deleteUsername = document.getElementById('delete-username');
  if (deleteUsername) {
    deleteUsername.textContent = user.username || 'Unknown';
  }
  
  const deleteModal = document.getElementById('delete-modal');
  if (deleteModal) {
    deleteModal.classList.add('active');
  }
};

async function handleDeleteConfirm() {
  if (!currentDeleteUserId) return;
  
  try {
    if (!window.userManager) {
      throw new Error('UserManager not found');
    }
    
    window.userManager.deleteUser(currentDeleteUserId);
    await window.userManager.saveUsers();
    await loadUsers();
    closeDeleteModal();
    showToast('User berhasil dihapus');
  } catch (error) {
    console.error('Error deleting user:', error);
    showToast('Gagal menghapus user', 'error');
  }
}

// ========== TOAST NOTIFICATION ==========
function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  const toastMessage = document.getElementById('toast-message');
  
  if (!toast || !toastMessage) return;
  
  const icon = toast.querySelector('i');
  
  toastMessage.textContent = message;
  
  if (type === 'error') {
    toast.classList.add('error');
    if (icon) icon.className = 'fas fa-exclamation-circle';
  } else {
    toast.classList.remove('error');
    if (icon) icon.className = 'fas fa-check-circle';
  }
  
  toast.classList.add('show');
  
  setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
}
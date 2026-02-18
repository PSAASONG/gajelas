// auth-new.js - Updated Authentication System with Role Management

// ========== AUTHENTICATION FUNCTIONS ==========
async function isAuthenticated() {
  return localStorage.getItem("authenticated") === "true";
}

async function authenticate(username, password) {
  try {
    // Load users from role manager
    await window.userManager.loadUsers();
    
    const result = window.userManager.authenticateUser(username, password);
    
    if (!result) {
      return { success: false, message: 'Username atau password salah' };
    }
    
    if (result.expired) {
      return { success: false, message: 'Akun Anda telah expired' };
    }
    
    // Set session
    RoleManager.setCurrentUser(result);
    
    return { success: true, user: result };
  } catch (error) {
    console.error('Authentication error:', error);
    return { success: false, message: 'Terjadi kesalahan saat login' };
  }
}

function logout() {
  RoleManager.logout();
}

function protectPage() {
  if (!isAuthenticated() && !window.location.pathname.includes("login.html")) {
    window.location.href = "login.html";
  }
}

// Auto-protect pages
if (typeof window !== 'undefined') {
  protectPage();
}
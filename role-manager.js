// role-manager.js - Sistem Role Management
// GitHub Configuration - GANTI DENGAN DATA ANDA
const GITHUB_CONFIG = {
  owner: '-',        // Ganti dengan username GitHub Anda
  repo: '-',               // Ganti dengan nama repository
  branch: 'main',                        // Branch (biasanya 'main' atau 'master')
  token: '-',           // Personal Access Token GitHub
  filePath: 'users.json'                // Path file di repository
};

// ========== GITHUB API FUNCTIONS ==========
async function getGitHubFile() {
  try {
    const url = `https://api.github.com/repos/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/contents/${GITHUB_CONFIG.filePath}?ref=${GITHUB_CONFIG.branch}`;
    const response = await fetch(url, {
      headers: {
        'Authorization': `token ${GITHUB_CONFIG.token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`GitHub API Error: ${response.status}`);
    }
    
    const data = await response.json();
    const content = atob(data.content); // Decode base64
    return {
      content: JSON.parse(content),
      sha: data.sha // Needed for updates
    };
  } catch (error) {
    console.error('Error fetching from GitHub:', error);
    // Fallback to local file if GitHub fails
    return await getLocalFile();
  }
}

async function updateGitHubFile(users, sha) {
  try {
    const url = `https://api.github.com/repos/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/contents/${GITHUB_CONFIG.filePath}`;
    const content = btoa(JSON.stringify({ users }, null, 2)); // Encode to base64
    
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${GITHUB_CONFIG.token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: `Update users data - ${new Date().toISOString()}`,
        content: content,
        sha: sha,
        branch: GITHUB_CONFIG.branch
      })
    });
    
    if (!response.ok) {
      throw new Error(`GitHub API Error: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error updating GitHub:', error);
    throw error;
  }
}

// Fallback: Load from local file
async function getLocalFile() {
  try {
    const response = await fetch('./users.json');
    const data = await response.json();
    return { content: data, sha: null };
  } catch (error) {
    console.error('Error loading local file:', error);
    return { content: { users: [] }, sha: null };
  }
}

// ========== USER MANAGEMENT FUNCTIONS ==========
class UserManager {
  constructor() {
    this.users = [];
    this.currentSha = null;
  }
  
  async loadUsers() {
    const result = await getGitHubFile();
    this.users = result.content.users || [];
    this.currentSha = result.sha;
    return this.users;
  }
  
  async saveUsers() {
    try {
      if (GITHUB_CONFIG.token === 'YOUR_GITHUB_TOKEN') {
        // Jika belum setup GitHub, simpan ke localStorage saja
        localStorage.setItem('users_backup', JSON.stringify(this.users));
        console.warn('GitHub not configured. Saving to localStorage only.');
        return true;
      }
      
      const result = await updateGitHubFile(this.users, this.currentSha);
      this.currentSha = result.content.sha;
      return true;
    } catch (error) {
      console.error('Error saving users:', error);
      // Backup to localStorage
      localStorage.setItem('users_backup', JSON.stringify(this.users));
      throw error;
    }
  }
  
  authenticateUser(username, password) {
    const user = this.users.find(u => 
      u.username === username && 
      u.password === password && 
      u.isActive === true
    );
    
    if (!user) return null;
    
    // Check expiry
    if (user.expiryDate) {
      const expiry = new Date(user.expiryDate);
      const now = new Date();
      if (now > expiry) {
        return { error: 'Account expired', expired: true };
      }
    }
    
    return user;
  }
  
  addUser(userData) {
    const newUser = {
      id: Date.now().toString(),
      username: userData.username,
      password: userData.password,
      role: userData.role || 'user',
      createdAt: new Date().toISOString(),
      expiryDate: userData.expiryDate || null,
      isActive: true
    };
    
    // Check if username exists
    if (this.users.find(u => u.username === newUser.username)) {
      throw new Error('Username already exists');
    }
    
    this.users.push(newUser);
    return newUser;
  }
  
  updateUser(userId, updates) {
    const index = this.users.findIndex(u => u.id === userId);
    if (index === -1) throw new Error('User not found');
    
    this.users[index] = { ...this.users[index], ...updates };
    return this.users[index];
  }
  
  deleteUser(userId) {
    const index = this.users.findIndex(u => u.id === userId);
    if (index === -1) throw new Error('User not found');
    
    this.users.splice(index, 1);
    return true;
  }
  
  getAllUsers() {
    return this.users;
  }
  
  getUserById(userId) {
    return this.users.find(u => u.id === userId);
  }
}

// Global instance
window.userManager = new UserManager();

// ========== SESSION MANAGEMENT ==========
function setCurrentUser(user) {
  localStorage.setItem('currentUser', JSON.stringify(user));
  localStorage.setItem('authenticated', 'true');
}

function getCurrentUser() {
  const userStr = localStorage.getItem('currentUser');
  return userStr ? JSON.parse(userStr) : null;
}

function isAdmin() {
  const user = getCurrentUser();
  return user && user.role === 'admin';
}

function logout() {
  localStorage.removeItem('authenticated');
  localStorage.removeItem('currentUser');
  window.location.href = 'login.html';
}

// Export functions
window.RoleManager = {
  setCurrentUser,
  getCurrentUser,
  isAdmin,
  logout
};

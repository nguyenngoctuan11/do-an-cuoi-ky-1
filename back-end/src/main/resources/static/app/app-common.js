export const apiBase = '';

export function token() { return localStorage.getItem('token'); }
export function setAuth(res){ if(res && res.accessToken){ localStorage.setItem('token', res.accessToken); localStorage.setItem('email', res.email||''); localStorage.setItem('roles', (res.roles&&res.roles.items||[]).join(',')); } }
export function clearAuth(){ localStorage.removeItem('token'); localStorage.removeItem('email'); localStorage.removeItem('roles'); }

export async function api(path, opts={}){
  const headers = Object.assign({'Content-Type':'application/json'}, opts.headers||{});
  if(token()) headers['Authorization'] = `Bearer ${token()}`;
  const r = await fetch(`${apiBase}${path}`, Object.assign({}, opts, { headers }));
  const text = await r.text(); let data; try{ data = text? JSON.parse(text): null;}catch{ data = text; }
  if(!r.ok) throw new Error((data && (data.message||data)) || r.statusText);
  return data;
}

export function qs(name){ return new URLSearchParams(location.search).get(name); }

export function nav(){
  const email = localStorage.getItem('email');
  const rolesStr = localStorage.getItem('roles') || '';
  const roles = rolesStr.split(',').map(s=>s.trim().toUpperCase()).filter(Boolean);

  const right = email
    ? `<span>${email} [${rolesStr}]</span> <a id="logoutLink" href="#">Đăng xuất</a>`
    : `<a href="/app/auth/login.html">Đăng nhập</a> <a href="/app/auth/register.html">Đăng ký</a>`;

  const adminLinks = [];
  if (roles.includes('TEACHER') || roles.includes('MANAGER')) {
    adminLinks.push(`<a href="/app/admin/teacher-courses.html">Khóa của tôi</a>`);
    adminLinks.push(`<a href="/app/admin/teacher-new-course.html">Tạo khóa học</a>`);
    adminLinks.push(`<a href="/app/admin/teacher-quiz.html">Tạo bài kiểm tra</a>`);
  }
  if (roles.includes('MANAGER')) {
    adminLinks.push(`<a href="/app/admin/manager-review.html">Duyệt khóa học</a>`);
    adminLinks.push(`<a href="/app/admin/db-browser.html">DB Browser</a>`);
  }

  return `
  <header class="topbar">
    <div class="brand">LMS Admin</div>
    <nav class="menu">
      <a href="/app/index.html">Tổng quan</a>
      <a href="/app/courses.html">Khóa học</a>
      ${adminLinks.join(' ')}
    </nav>
    <div class="who">${right}</div>
  </header>`;
}

export function mountNav(targetId='nav'){
  const container = document.getElementById(targetId);
  if(!container) return;
  container.innerHTML = nav();
  const link = document.getElementById('logoutLink');
  if(link){ link.addEventListener('click', (e)=>{
    e.preventDefault();
    try { clearAuth(); } catch {}
    window.location.replace('/app/auth/login.html');
  }); }
}

export function requireAuth(roles){
  if(!token()){ location.href = '/app/auth/login.html'; return false; }
  if(roles){
    const my = (localStorage.getItem('roles')||'').split(',').map(s=>s.trim().toUpperCase()).filter(Boolean);
    const need = (Array.isArray(roles)?roles:[roles]).map(r=>String(r).toUpperCase());
    const ok = need.some(r => my.includes(r));
    if(!ok){ alert('Bạn không có quyền truy cập'); location.href='/app/index.html'; return false; }
  }
  return true;
}


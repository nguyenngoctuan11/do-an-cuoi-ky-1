export const apiBase = '';

export function token(){ return localStorage.getItem('token'); }

export function setAuth(res){
  if(res && res.accessToken){
    localStorage.setItem('token', res.accessToken);
    localStorage.setItem('email', res.email || '');
    const roles = (res.roles && res.roles.items) ? res.roles.items : [];
    localStorage.setItem('roles', roles.join(','));
  }
}

export function clearAuth(){
  localStorage.removeItem('token');
  localStorage.removeItem('email');
  localStorage.removeItem('roles');
}

export function currentUser(){
  const email = localStorage.getItem('email') || '';
  const rawRoles = localStorage.getItem('roles') || '';
  const roles = rawRoles.split(',').map(r => r.trim().toUpperCase()).filter(Boolean);
  return { email, rawRoles, roles };
}

function adminLinksForRoles(roles){
  const items = [];
  const canTeach = roles.includes('TEACHER') || roles.includes('MANAGER');
  if(canTeach){
    items.push({ id:'teacher-courses', href:'/app/admin/teacher-courses.html', label:'Khoá học của tôi', hint:'Theo dõi bản nháp & trạng thái' });
    items.push({ id:'teacher-new-course', href:'/app/admin/teacher-new-course.html', label:'Tạo khóa học', hint:'Lên nội dung & modules' });
    items.push({ id:'teacher-quiz', href:'/app/admin/teacher-quiz.html', label:'Tạo bài kiểm tra', hint:'Thêm câu hỏi, media' });
  }
  if(roles.includes('MANAGER')){
    items.push({ id:'admin-users', href:'/app/admin/users.html', label:'Người dùng', hint:'Tạo / sửa / xóa tài khoản' });
    items.push({ id:'manager-review', href:'/app/admin/manager-review.html', label:'Duyệt khóa học', hint:'Phê duyệt nội dung mới' });
    items.push({ id:'db-browser', href:'/app/admin/db-browser.html', label:'DB Browser', hint:'Quan sát dữ liệu trực tiếp' });
  }
  return items;
}

export async function api(path, opts={}){
  const headers = Object.assign({'Content-Type':'application/json'}, opts.headers || {});
  if(token()) headers['Authorization'] = `Bearer ${token()}`;
  let target = path || '';
  if(!/^https?:/i.test(target)){
    target = target.startsWith('/') ? target : `/${target}`;
    target = `${apiBase}${target}`;
  }
  const response = await fetch(target, Object.assign({}, opts, { headers }));
  const text = await response.text();
  let data;
  try{ data = text ? JSON.parse(text) : null; }catch{ data = text; }
  if(!response.ok){
    throw new Error((data && (data.message || data.error)) || response.statusText);
  }
  return data;
}

export function qs(name){
  return new URLSearchParams(location.search).get(name);
}

export function handleLogout(e){
  if(e && typeof e.preventDefault === 'function') e.preventDefault();
  clearAuth();
  location.href = '/app/auth/login.html';
}

export function nav(variant='default'){
  if(variant === 'sidebar' || variant === 'none'){ return ''; }
  const { email, roles } = currentUser();
  const currentPath = location.pathname;
  const mainLinks = [
    { href:'/app/index.html', label:'Tổng quan' },
    { href:'/app/courses.html', label:'Khóa học' }
  ];
  const adminLinks = variant === 'compact' ? [] : adminLinksForRoles(roles);
  const who = email
    ? `<div>${email}${roles.length ? ` <span class=\"muted\">[${roles.join(', ')}]</span>` : ''}</div>
       <a id=\"logoutLink\" class=\"text-link\" href=\"#\">Đăng xuất</a>`
    : `<a class=\"text-link\" href=\"/app/auth/login.html\">Đăng nhập</a>
       <a class=\"text-link\" href=\"/app/auth/register.html\">Đăng ký</a>`;
  return `
    <header class=\"topbar ${variant==='compact'?'topbar-compact':''}\">
      <div class=\"brand\">
        <div class=\"brand-dot\"></div>
        <div>
          <div>LMS Admin</div>
          <small class=\"muted\">Không gian quản trị</small>
        </div>
      </div>
      <nav class=\"menu\">
        ${mainLinks.map(link => `<a href=\"${link.href}\" class=\"${currentPath===link.href?'active':''}\">${link.label}</a>`).join('')}
        ${adminLinks.map(link => `<a href=\"${link.href}\" class=\"${currentPath===link.href?'active':''}\">${link.label}</a>`).join('')}
      </nav>
      <div class=\"who\">${who}</div>
    </header>
  `;
}

export function mountNav(targetId='nav', variantOverride){
  const container = document.getElementById(targetId);
  if(!container) return;
  const variant = variantOverride
    || (container.dataset && container.dataset.variant ? container.dataset.variant : 'default');
  const html = nav(variant);
  if(!html){
    container.innerHTML = '';
    container.style.display = 'none';
    return;
  }
  container.innerHTML = html;
  const logout = container.querySelector('#logoutLink');
  if(logout) logout.addEventListener('click', handleLogout);
}

export function mountAdminMenu(targetId='adminMenu', activeId){
  const host = document.getElementById(targetId);
  if(!host) return;
  const { roles } = currentUser();
  const links = adminLinksForRoles(roles);
  if(!links.length){
    host.innerHTML = '<div class=\"empty\">Bạn chưa có quyền quản lý</div>';
    return;
  }
  const key = activeId || location.pathname;
  host.innerHTML = links.map(link => {
    const isActive = key === link.id || key === link.href || location.pathname === link.href;
    return `<a href=\"${link.href}\" class=\"admin-menu-link ${isActive?'is-active':''}\">
      <span class=\"title\">${link.label}</span>
      ${link.hint ? `<span class=\"hint\">${link.hint}</span>` : ''}
    </a>`;
  }).join('');
}

export function mountAdminUser(targetId='adminUserCard'){
  const host = document.getElementById(targetId);
  if(!host) return;
  const { email, roles } = currentUser();
  if(!email){
    host.innerHTML = `<span class=\"muted\">Chưa đăng nhập</span>
      <a class=\"btn ghost small\" href=\"/app/auth/login.html\">Đăng nhập</a>`;
    return;
  }
  host.innerHTML = `
    <span class=\"muted\">Đang đăng nhập</span>
    <strong>${email}</strong>
    <span class=\"muted\">${roles.join(', ') || 'user'}</span>
    <a href=\"#\" id=\"sidebarLogout\" class=\"text-link\">Đăng xuất</a>
  `;
  const logout = host.querySelector('#sidebarLogout');
  if(logout) logout.addEventListener('click', handleLogout);
}

export function requireAuth(roles){
  if(!token()){
    location.href = '/app/auth/login.html';
    return false;
  }
  if(roles){
    const myRoles = currentUser().roles;
    const needed = (Array.isArray(roles) ? roles : [roles]).map(r => String(r).toUpperCase());
    const ok = needed.some(role => myRoles.includes(role));
    if(!ok){
      alert('Bạn không có quyền truy cập khu vực này');
      location.href = '/app/index.html';
      return false;
    }
  }
  return true;
}

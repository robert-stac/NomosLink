const fs = require('fs');

function updateFile(filePath) {
  let file = fs.readFileSync(filePath, 'utf8');
  file = file.replace(/allowedRoles=\{\[(.*?)\]\}/g, (match, p1) => {
    if (p1.includes('"admin"') && !p1.includes('"managing_partner"')) {
      return `allowedRoles={[${p1}, "managing_partner"]}`;
    }
    return match;
  });
  
  // also update getDashboardComponent
  file = file.replace(
    /if \(currentUser\?.role === "manager"\) return <ManagerDashboard \/>;/g,
    `if (currentUser?.role === "manager" || currentUser?.role === "managing_partner") return <ManagerDashboard />;`
  );

  // also update getRedirectPath
  file = file.replace(
    /if \(\["admin", "accountant", "manager"\]\.includes\(currentUser\.role\)\)/g,
    `if (["admin", "accountant", "manager", "managing_partner"].includes(currentUser.role))`
  );

  // also update sidebar rendering checks in App.tsx
  file = file.replace(
    /\["admin", "manager", "accountant"\]\.includes\(currentUser\?\.role \|\| ""\)/g,
    `["admin", "manager", "managing_partner", "accountant"].includes(currentUser?.role || "")`
  );

  fs.writeFileSync(filePath, file);
}

updateFile('src/App.tsx');
console.log('Done App.tsx');

function updateSidebar(filePath) {
  let file = fs.readFileSync(filePath, 'utf8');
  file = file.replace(/const isManager = role === "manager";/, `const isManager = role === "manager";\n  const isManagingPartner = role === "managing_partner";`);
  file = file.replace(/const isStaff = isAdmin \|\| isAccountant \|\| isManager;/, `const isStaff = isAdmin || isAccountant || isManager || isManagingPartner;`);
  file = file.replace(/isAdmin \|\| isManager/g, `isAdmin || isManager || isManagingPartner`);
  fs.writeFileSync(filePath, file);
}

updateSidebar('src/components/Sidebar.tsx');
console.log('Done Sidebar.tsx');

function updateAppContext(filePath) {
  let file = fs.readFileSync(filePath, 'utf8');
  file = file.replace(
    /export type UserRole = "admin" \| "manager" \| "lawyer" \| "clerk" \| "accountant";/,
    `export type UserRole = "admin" | "manager" | "managing_partner" | "lawyer" | "clerk" | "accountant";`
  );
  fs.writeFileSync(filePath, file);
}

updateAppContext('src/context/AppContext.tsx');
console.log('Done AppContext.tsx');

function updateAddUser(filePath) {
  let file = fs.readFileSync(filePath, 'utf8');
  file = file.replace(
    /<option value="manager">Legal Manager<\/option>/,
    `<option value="manager">Legal Manager</option>\n            <option value="managing_partner">Managing Partner</option>`
  );
  fs.writeFileSync(filePath, file);
}

updateAddUser('src/pages/AddUser.tsx');
console.log('Done AddUser.tsx');


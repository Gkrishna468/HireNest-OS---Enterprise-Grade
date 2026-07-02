import fs from 'fs';
const content = fs.readFileSync('src/App.tsx', 'utf8');

const targetStr = `              <SidebarItem
                to="/emails"
                icon={MessageSquare}
                label="Intake Dashboard"
                active={location.pathname === "/emails"}
                onClick={() => setIsMobileMenuOpen(false)}
              />`;

const replacement = `              <SidebarItem
                to="/emails"
                icon={MessageSquare}
                label="Intake Dashboard"
                active={location.pathname === "/emails"}
                onClick={() => setIsMobileMenuOpen(false)}
              />
              <SidebarItem
                to="/whatsapp"
                icon={MessageCircle}
                label="WhatsApp Hub"
                active={location.pathname === "/whatsapp"}
                onClick={() => setIsMobileMenuOpen(false)}
              />`;

if (content.includes(targetStr)) {
    const newContent = content.replace(targetStr, replacement);
    fs.writeFileSync('src/App.tsx', newContent);
    console.log("Patched App.tsx");
} else {
    console.log("Target not found");
}

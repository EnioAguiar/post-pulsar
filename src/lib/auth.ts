import { supabase } from "./supabase";

import type { AuthChangeEvent, Session } from "@supabase/supabase-js";

// Helper function to toggle link visibility based on authentication status
function toggleAuthLinks(container: HTMLElement | null, isLoggedIn: boolean): void {
  console.log(`[auth.ts] toggleAuthLinks called. isLoggedIn: ${isLoggedIn}`);
  if (!container) {
    console.log('[auth.ts] Container not found, returning.');
    return;
  }

  const loggedInLinks = container.querySelectorAll<HTMLElement>('[data-auth="true"]');
  const loggedOutLinks = container.querySelectorAll<HTMLElement>('[data-auth="false"]');

  loggedInLinks.forEach(link => {
    const href = link.getAttribute('href') || (link.id);
    console.log(`[auth.ts] Setting ${href} display to: ${isLoggedIn ? "inline-block" : "none"}`);
    link.style.display = isLoggedIn ? "inline-block" : "none";
  });
  loggedOutLinks.forEach(link => {
    const href = link.getAttribute('href') || (link.id);
    console.log(`[auth.ts] Setting ${href} display to: ${!isLoggedIn ? "inline-block" : "none"}`);
    link.style.display = !isLoggedIn ? "inline-block" : "none";
  });
}

export function manageAuth(): void {
  console.log("[auth.ts] manageAuth started.");
  const protectedRoutes = ["/app"];
  const authRoutes = ["/login", "/signup"];
  const currentPath = window.location.pathname;

  supabase.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
    console.log("[auth.ts] onAuthStateChange triggered.");
    const user = session?.user;
    console.log(`[auth.ts] User session found: ${!!user}`);
    
    // Handle redirects
    if (user && authRoutes.includes(currentPath)) {
      window.location.href = "/app";
    }
    if (!user && protectedRoutes.some(route => currentPath.startsWith(route))) {
      window.location.href = "/login";
    }

    // Handle header and CTA button visibility
    const navLinks = document.getElementById("nav-links");
    const ctaButtons = document.getElementById("cta-buttons");

    console.log("[auth.ts] Calling toggleAuthLinks for nav-links.");
    toggleAuthLinks(navLinks, !!user);
    if(navLinks) navLinks.classList.remove("hidden"); // Ensure nav is visible after logic runs
    
    console.log("[auth.ts] Calling toggleAuthLinks for cta-buttons.");
    toggleAuthLinks(ctaButtons, !!user);
  });

  // Handle logout button
  const logoutBtn = document.getElementById("logout-btn-header");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      await supabase.auth.signOut();
      window.location.href = "/";
    });
  }
}

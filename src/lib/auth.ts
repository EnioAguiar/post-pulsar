import { supabase } from "./supabase";

export function manageAuth() {
  const protectedRoutes = ["/app"];
  const authRoutes = ["/login", "/signup"];
  const currentPath = window.location.pathname;

  supabase.auth.onAuthStateChange((event, session) => {
    const user = session?.user;

    // Handle redirects
    if (user && authRoutes.includes(currentPath)) {
      window.location.href = "/app";
    }
    if (!user && protectedRoutes.includes(currentPath)) {
      window.location.href = "/login";
    }

    // Handle header links
    const navLinks = document.getElementById("nav-links");
    if (navLinks) {
      const loggedInLinks = navLinks.querySelectorAll('[data-auth="true"]');
      const loggedOutLinks = navLinks.querySelectorAll('[data-auth="false"]');

      if (user) {
        loggedInLinks.forEach(
          (link) => ((link as HTMLElement).style.display = "inline-block"),
        );
        loggedOutLinks.forEach(
          (link) => ((link as HTMLElement).style.display = "none"),
        );
      } else {
        loggedInLinks.forEach(
          (link) => ((link as HTMLElement).style.display = "none"),
        );
        loggedOutLinks.forEach(
          (link) => ((link as HTMLElement).style.display = "inline-block"),
        );
      }
      navLinks.classList.remove("hidden");
    }

    // Handle home page CTA buttons
    const ctaButtons = document.getElementById("cta-buttons");
    if (ctaButtons) {
      const loggedInLinks = ctaButtons.querySelectorAll('[data-auth="true"]');
      const loggedOutLinks = ctaButtons.querySelectorAll('[data-auth="false"]');

      if (user) {
        loggedInLinks.forEach(
          (link) => ((link as HTMLElement).style.display = "inline-block"),
        );
        loggedOutLinks.forEach(
          (link) => ((link as HTMLElement).style.display = "none"),
        );
      } else {
        loggedInLinks.forEach(
          (link) => ((link as HTMLElement).style.display = "none"),
        );
        loggedOutLinks.forEach(
          (link) => ((link as HTMLElement).style.display = "inline-block"),
        );
      }
    }
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

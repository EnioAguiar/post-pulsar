import { supabase } from "./supabase";

import type { AuthChangeEvent, Session } from "@supabase/supabase-js";

function toggleAuthLinks(
  container: HTMLElement | null,
  isLoggedIn: boolean,
): void {
  if (!container) return;

  const loggedInLinks =
    container.querySelectorAll<HTMLElement>('[data-auth="true"]');
  const loggedOutLinks = container.querySelectorAll<HTMLElement>(
    '[data-auth="false"]',
  );

  loggedInLinks.forEach((link) => {
    if (isLoggedIn) {
      link.classList.remove("auth-hidden");
    } else {
      link.classList.add("auth-hidden");
    }
  });

  loggedOutLinks.forEach((link) => {
    if (!isLoggedIn) {
      link.classList.remove("auth-hidden");
    } else {
      link.classList.add("auth-hidden");
    }
  });
}

export function manageAuth(): void {
  const protectedRoutes = ["/app"];
  const authRoutes = ["/login", "/signup"];
  const currentPath = window.location.pathname;

  supabase.auth.onAuthStateChange(
    (event: AuthChangeEvent, session: Session | null) => {
      console.log("[DEBUG] Auth State Change Event:", event);
      console.log("[DEBUG] Session Object:", session);

      try {
        const user = session?.user;

        // Handle redirects
        if (user && authRoutes.includes(currentPath)) {
          window.location.href = "/app";
        }
        if (
          !user &&
          protectedRoutes.some((route) => currentPath.startsWith(route))
        ) {
          window.location.href = "/login";
        }

        // Handle header and CTA button visibility
        const navLinks = document.getElementById("nav-links");
        const ctaButtons = document.getElementById("cta-buttons");

        toggleAuthLinks(navLinks, !!user);
        toggleAuthLinks(ctaButtons, !!user);
      } catch (e) {
        console.error("[DEBUG] Caught an error inside onAuthStateChange:", e);
      }
    },
  );

  // Handle logout button
  const logoutBtn = document.getElementById("logout-btn-header");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      await supabase.auth.signOut();
      window.location.href = "/";
    });
  }
}

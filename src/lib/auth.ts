import { supabase } from "./supabase";

import type { AuthChangeEvent, Session } from "@supabase/supabase-js";

function toggleAuthLinks(isLoggedIn: boolean): void {
  const loggedInElements = document.querySelectorAll<HTMLElement>(
    '[data-auth="true"]',
  );
  const loggedOutElements = document.querySelectorAll<HTMLElement>(
    '[data-auth="false"]',
  );

  loggedInElements.forEach((element) => {
    if (isLoggedIn) {
      element.classList.remove("auth-hidden");
    } else {
      element.classList.add("auth-hidden");
    }
  });

  loggedOutElements.forEach((element) => {
    if (!isLoggedIn) {
      element.classList.remove("auth-hidden");
    } else {
      element.classList.add("auth-hidden");
    }
  });
}

export function manageAuth(): void {
  const protectedRoutes = ["/app"];
  const authRoutes = ["/login", "/signup"];
  const currentPath = window.location.pathname;

  supabase.auth.onAuthStateChange(
    (_event: AuthChangeEvent, session: Session | null) => {
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

        // Handle visibility of all auth-dependent elements
        toggleAuthLinks(!!user);
      } catch (e) {
        console.error("Caught error during auth state change:", e);
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

import { Link, useLocation } from "wouter";
import { LogOut, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { userInitials, useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";

/** Top-bar account control: a "Log in" button for guests, an avatar menu once signed in. */
export default function AccountMenu() {
  const { user, status, logout } = useAuth();
  const { t } = useLanguage();
  const [location, navigate] = useLocation();

  // Render nothing while the stored session is being checked, so the button doesn't flash.
  if (status === "loading") return null;

  if (!user) {
    const next = location === "/" ? "" : `?next=${encodeURIComponent(location)}`;
    return (
      <Button asChild size="sm" className="h-9 px-4 font-semibold">
        <Link href={`/login${next}`}>{t("logIn")}</Link>
      </Button>
    );
  }

  const handleLogout = () => {
    // Leave the account page first, so it doesn't redirect to the login page as the session ends.
    if (location.startsWith("/account")) navigate("/");
    void logout();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={t("accountMenuFor", { name: user.name })}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary text-xs font-bold text-primary-foreground ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          {userInitials(user.name)}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="font-normal">
          <p className="truncate text-sm font-semibold">{user.name}</p>
          <p className="truncate text-xs text-muted-foreground">{user.email}</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/account">
            <User /> {t("myAccountAndBookings")}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={handleLogout}>
          <LogOut /> {t("logOut")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

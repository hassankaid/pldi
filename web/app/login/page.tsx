"use client";

import { useActionState } from "react";
import { Sparkles } from "lucide-react";
import { login, type LoginState } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function LoginPage() {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(
    login,
    undefined,
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-ground p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="h-8 w-8 rounded-md border border-gold-line bg-gold-soft flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-gold-ink" strokeWidth={2.5} />
          </div>
          <span className="text-base font-semibold text-ink">PLDI</span>
          <span className="text-[11px] text-ink-faint tracking-wider uppercase">
            Compta
          </span>
        </div>

        {/* Card */}
        <div className="rounded-xl border border-line bg-surface p-7 shadow-sm">
          <div className="mb-6">
            <h1 className="text-[18px] font-semibold text-ink">
              Connexion
            </h1>
            <p className="text-[13px] text-ink-soft mt-1">
              Accédez au pilotage des ventes Kajabi.
            </p>
          </div>

          <form action={formAction} className="space-y-4">
            <div className="space-y-1.5">
              <Label
                htmlFor="email"
                className="text-[12px] font-medium text-ink-soft"
              >
                Email
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="vous@example.com"
                className="h-9 text-[13px]"
              />
            </div>
            <div className="space-y-1.5">
              <Label
                htmlFor="password"
                className="text-[12px] font-medium text-ink-soft"
              >
                Mot de passe
              </Label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
                className="h-9 text-[13px]"
              />
            </div>
            {state?.error && (
              <Alert
                variant="destructive"
                className="text-[12px] py-2"
              >
                <AlertDescription>{state.error}</AlertDescription>
              </Alert>
            )}
            <Button
              type="submit"
              className="w-full h-9 text-[13px]"
              disabled={pending}
            >
              {pending ? "Connexion…" : "Se connecter"}
            </Button>
          </form>
        </div>

        <p className="text-center text-[11px] text-ink-faint mt-6">
          Accès restreint aux utilisateurs autorisés.
        </p>
      </div>
    </div>
  );
}

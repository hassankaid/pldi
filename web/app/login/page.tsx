"use client";

import { useActionState } from "react";
import { login, type LoginState } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function LoginPage() {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(
    login,
    undefined,
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md shadow-sm">
        <CardHeader>
          <CardTitle className="text-2xl">PLDI&nbsp;Compta</CardTitle>
          <CardDescription>
            Connectez-vous pour accéder au pilotage des ventes Kajabi.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="vous@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Mot de passe</Label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
              />
            </div>
            {state?.error && (
              <Alert variant="destructive">
                <AlertDescription>{state.error}</AlertDescription>
              </Alert>
            )}
            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? "Connexion…" : "Se connecter"}
            </Button>
          </form>
          <p className="text-xs text-muted-foreground mt-6 text-center">
            Accès restreint aux utilisateurs autorisés.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

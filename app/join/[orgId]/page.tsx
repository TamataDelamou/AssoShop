"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { organizationsService } from "@/services/community/organizations";
import { membersService } from "@/services/community/members";
import { Organization } from "@/types/modules/community";
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

export default function JoinAssociationPage() {
  const params = useParams<{ orgId: string }>();
  const orgId = params?.orgId;

  const [org, setOrg] = useState<Organization | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orgId) return;
    let cancelled = false;
    organizationsService
      .getOrganization(orgId)
      .then((orgData) => {
        if (!cancelled) setOrg(orgData);
      })
      .catch(() => {
        if (!cancelled) setError("Association introuvable.");
      });
    return () => {
      cancelled = true;
    };
  }, [orgId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!orgId) {
      setError("Association introuvable.");
      return;
    }
    if (!name.trim()) {
      setError("Veuillez indiquer votre nom.");
      return;
    }

    setStatus("loading");
    try {
      await membersService.submitAdhesionRequest(orgId, {
        name: name.trim(),
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
      });
      setStatus("success");
    } catch {
      setStatus("error");
      setError("Impossible d'envoyer la demande. Réessayez.");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md shadow-[0_0_30px_rgba(0,240,255,0.25)]">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-light text-foreground">
            {org ? `Rejoindre ${org.name}` : "Demande d'adhésion"}
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            {org?.object ||
              "Remplissez ce formulaire pour soumettre votre candidature."}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive" className="border-destructive/50">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {status === "success" ? (
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <CheckCircle2 className="h-10 w-10 text-primary" />
              <p className="text-foreground">
                Votre demande a bien été envoyée.
              </p>
              <p className="text-sm text-muted-foreground">
                Le bureau de l&apos;association l&apos;examinera et vous
                répondra prochainement.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-foreground">
                  Nom complet <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="bg-input/50 border-border/50 text-foreground placeholder:text-muted-foreground/50"
                  placeholder="Ex : Aïssatou Diallo"
                  disabled={status === "loading"}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-foreground">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-input/50 border-border/50 text-foreground placeholder:text-muted-foreground/50"
                  placeholder="vous@exemple.com"
                  disabled={status === "loading"}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone" className="text-foreground">
                  Téléphone
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="bg-input/50 border-border/50 text-foreground placeholder:text-muted-foreground/50"
                  placeholder="+224 ..."
                  disabled={status === "loading"}
                />
              </div>

              <Button
                type="submit"
                disabled={status === "loading"}
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {status === "loading"
                  ? "Envoi en cours..."
                  : "Envoyer ma demande"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

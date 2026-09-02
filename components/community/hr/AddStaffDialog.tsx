"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  ContractType,
  CreateStaffPayload,
  StaffType,
} from "@/types/modules/community";

const TYPES: { value: StaffType; label: string }[] = [
  { value: StaffType.EMPLOYEE, label: "Employé" },
  { value: StaffType.VOLUNTEER, label: "Bénévole" },
  { value: StaffType.CONSULTANT, label: "Consultant" },
];

const CONTRACTS: { value: ContractType; label: string }[] = [
  { value: ContractType.CDI, label: "CDI" },
  { value: ContractType.CDD, label: "CDD" },
  { value: ContractType.VOLUNTEERING, label: "Bénévolat" },
  { value: ContractType.CONSULTING, label: "Prestation" },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  creating: boolean;
  onCreate: (payload: CreateStaffPayload) => Promise<void>;
}

export function AddStaffDialog({
  open,
  onOpenChange,
  creating,
  onCreate,
}: Props) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [type, setType] = useState<StaffType>(StaffType.EMPLOYEE);
  const [position, setPosition] = useState("");
  const [contract, setContract] = useState<ContractType>(ContractType.CDI);
  const [salary, setSalary] = useState("");
  const [hireDate, setHireDate] = useState("");
  const [error, setError] = useState<string | null>(null);

  const isVolunteer =
    type === StaffType.VOLUNTEER || contract === ContractType.VOLUNTEERING;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!firstName.trim() || !lastName.trim()) {
      setError("Le nom et le prénom sont obligatoires.");
      return;
    }
    if (!position.trim()) {
      setError("Le poste est obligatoire.");
      return;
    }
    try {
      await onCreate({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        type,
        position: position.trim(),
        contract_type: contract,
        monthly_salary: isVolunteer ? 0 : Number(salary) || 0,
        hire_date: hireDate || undefined,
      });
      setFirstName("");
      setLastName("");
      setType(StaffType.EMPLOYEE);
      setPosition("");
      setContract(ContractType.CDI);
      setSalary("");
      setHireDate("");
      onOpenChange(false);
    } catch (err) {
      setError((err as Error).message || "Impossible d'ajouter le membre.");
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) setError(null);
        onOpenChange(v);
      }}
    >
      <DialogContent className="bg-card/90 backdrop-blur-xl border-border/50 text-foreground max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-light">
            Ajouter un membre du personnel
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Employé, bénévole ou consultant de l&apos;association.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {error && (
            <Alert variant="destructive" className="border-destructive/50">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="staff-first" className="text-foreground">
                Prénom <span className="text-destructive">*</span>
              </Label>
              <Input
                id="staff-first"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="bg-input/50 border-border/50 text-foreground"
                disabled={creating}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="staff-last" className="text-foreground">
                Nom <span className="text-destructive">*</span>
              </Label>
              <Input
                id="staff-last"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="bg-input/50 border-border/50 text-foreground"
                disabled={creating}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="staff-position" className="text-foreground">
              Poste <span className="text-destructive">*</span>
            </Label>
            <Input
              id="staff-position"
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              className="bg-input/50 border-border/50 text-foreground"
              placeholder="Ex : Comptable"
              disabled={creating}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="staff-type" className="text-foreground">
                Type
              </Label>
              <Select
                value={type}
                onValueChange={(v) => setType(v as StaffType)}
                disabled={creating}
              >
                <SelectTrigger className="bg-input/50 border-border/50 text-foreground">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-border/50">
                  {TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="staff-contract" className="text-foreground">
                Contrat
              </Label>
              <Select
                value={contract}
                onValueChange={(v) => setContract(v as ContractType)}
                disabled={creating}
              >
                <SelectTrigger className="bg-input/50 border-border/50 text-foreground">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-border/50">
                  {CONTRACTS.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="staff-salary" className="text-foreground">
                Salaire mensuel (GNF)
              </Label>
              <Input
                id="staff-salary"
                type="number"
                min={0}
                value={salary}
                onChange={(e) => setSalary(e.target.value)}
                className="bg-input/50 border-border/50 text-foreground"
                placeholder="0"
                disabled={creating || isVolunteer}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="staff-hire" className="text-foreground">
                Date d&apos;entrée
              </Label>
              <Input
                id="staff-hire"
                type="date"
                value={hireDate}
                onChange={(e) => setHireDate(e.target.value)}
                className="bg-input/50 border-border/50 text-foreground"
                disabled={creating}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="text-muted-foreground hover:text-foreground"
              disabled={creating}
            >
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={creating}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {creating ? "Ajout..." : "Ajouter"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

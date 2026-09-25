import { Briefcase, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ActionButton } from "@/components/workspace/action-button";
import { FormDialog } from "@/components/workspace/form-dialog";
import { Field } from "@/components/workspace/ui-kit";
import { crearCargo, eliminarCargo } from "./actions";

/** Catálogo de cargos / ministerios (alabanza, danza, sonido…). Solo pastor y superadmin. */
export function GestionCargos({ areas }: { areas: { id: string; nombre: string; total: number }[] }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Briefcase /> Cargos
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cargos y ministerios</DialogTitle>
          <DialogDescription>Lo que cada fiel puede ocupar dentro de la iglesia. Un fiel puede tener varios.</DialogDescription>
        </DialogHeader>
        <ul className="max-h-80 divide-y overflow-y-auto rounded-lg border">
          {areas.map((a) => (
            <li key={a.id} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
              <span>
                {a.nombre} <span className="text-muted-foreground text-xs">· {a.total} fieles</span>
              </span>
              <ActionButton
                size="icon-sm"
                variant="ghost"
                aria-label={`Eliminar ${a.nombre}`}
                confirm={a.total ? `"${a.nombre}" lo tienen ${a.total} fieles; se les quitará. ¿Eliminar?` : `¿Eliminar "${a.nombre}"?`}
                successMessage="Cargo eliminado"
                action={eliminarCargo.bind(null, a.id)}
              >
                <Trash2 className="text-red-600" />
              </ActionButton>
            </li>
          ))}
          {areas.length === 0 && <li className="text-muted-foreground p-3 text-sm">Aún no hay cargos.</li>}
        </ul>
        <FormDialog
          title="Nuevo cargo"
          action={crearCargo}
          successMessage="Cargo agregado"
          trigger={<Button size="sm">Agregar cargo</Button>}
        >
          <Field label="Nombre">
            <Input name="nombre" placeholder="Ej: Ministerio de jóvenes" required />
          </Field>
        </FormDialog>
      </DialogContent>
    </Dialog>
  );
}

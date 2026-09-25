import type { EstadoCertificado, Prisma } from "@prisma/client";
import { Award, Ban, CheckCircle, Clock, Download, ExternalLink, Signature } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ActionButton } from "@/components/workspace/action-button";
import { SearchBar } from "@/components/workspace/search-bar";
import { EmptyState, EstadoBadge, KpiCard, PageHeader, Panel } from "@/components/workspace/ui-kit";
import { ESTADO_CERTIFICADO, fecha, opciones } from "@/lib/labels";
import { prisma } from "@/lib/prisma";
import { R, tieneRol } from "@/lib/roles";
import { requirePage } from "@/lib/server/session";
import { cursosEnAlcance, filtroCurso } from "@/server/academico";
import { anular, firmar } from "./actions";

function Check({ at }: { at: Date | null }) {
  return at ? <span title={fecha(at)} className="text-emerald-600">✓</span> : <span className="text-muted-foreground">—</span>;
}

export default async function CertificadosPage({ searchParams }: { searchParams: Promise<{ estado?: string; q?: string }> }) {
  const user = await requirePage(R.ACADEMICO);
  const { estado, q } = await searchParams;
  const alcance = await cursosEnAlcance(user);
  const esAdmin = tieneRol(user.rol, R.ADMIN);
  const firmaSupervisor = tieneRol(user.rol, R.FIRMA_SUPERVISOR);

  const base: Prisma.CertificadoWhereInput = { cursoId: filtroCurso(alcance) };
  const where: Prisma.CertificadoWhereInput = {
    ...base,
    ...(estado ? { estado: estado as EstadoCertificado } : {}),
    ...(q
      ? {
          OR: [
            { codigo: { contains: q, mode: "insensitive" } },
            { fiel: { nombre: { contains: q, mode: "insensitive" } } },
            { fiel: { apellido: { contains: q, mode: "insensitive" } } },
          ],
        }
      : {}),
  };
  const [certs, emitidos, pendSupervisor, pendPastor] = await Promise.all([
    prisma.certificado.findMany({ where, include: { fiel: true, curso: true }, orderBy: { createdAt: "desc" }, take: 300 }),
    prisma.certificado.count({ where: { ...base, estado: "EMITIDO" } }),
    prisma.certificado.count({ where: { ...base, estado: "EN_FIRMA", firmaSupervisorAt: null } }),
    prisma.certificado.count({ where: { ...base, estado: "EN_FIRMA", firmaSupervisorAt: { not: null }, firmaPastorAt: null } }),
  ]);

  return (
    <>
      <PageHeader title="Certificados" description="Flujo de firmas: Maestro → Supervisor → Pastor. Con la firma del pastor se genera el PDF." />
      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard icon={CheckCircle} label="Emitidos" value={emitidos} color="green" />
        <KpiCard icon={Clock} label="Esperan al supervisor" value={pendSupervisor} color="amber" />
        <KpiCard icon={Signature} label="Esperan al pastor" value={pendPastor} color="violet" />
      </div>
      <SearchBar placeholder="Buscar por estudiante o código..." filtros={[{ name: "estado", label: "Todos los estados", options: opciones(ESTADO_CERTIFICADO) }]} />
      <Panel>
        {certs.length === 0 ? (
          <EmptyState icon={Award}>Sin certificados. Se inician desde “Mis clases” al aprobar a un estudiante.</EmptyState>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Estudiante</TableHead>
                <TableHead>Curso</TableHead>
                <TableHead className="text-center">Maestro</TableHead>
                <TableHead className="text-center">Supervisor</TableHead>
                <TableHead className="text-center">Pastor</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {certs.map((c) => {
                const enFirma = c.estado === "EN_FIRMA";
                return (
                  <TableRow key={c.id}>
                    <TableCell className="text-muted-foreground font-mono text-xs">{c.codigo}</TableCell>
                    <TableCell className="font-medium">
                      {c.fiel.nombre} {c.fiel.apellido}
                    </TableCell>
                    <TableCell>
                      <Badge variant="violet">{c.curso.nombre}</Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Check at={c.firmaMaestroAt} />
                    </TableCell>
                    <TableCell className="text-center">
                      <Check at={c.firmaSupervisorAt} />
                    </TableCell>
                    <TableCell className="text-center">
                      <Check at={c.firmaPastorAt} />
                    </TableCell>
                    <TableCell>
                      <EstadoBadge valor={c.estado} mapa={ESTADO_CERTIFICADO} />
                      {c.emitidoAt && <div className="text-muted-foreground text-xs">{fecha(c.emitidoAt)}</div>}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1.5">
                        {enFirma && firmaSupervisor && !c.firmaSupervisorAt && (
                          <ActionButton size="sm" confirm="¿Firmar este certificado como supervisor?" successMessage="Firmado. Pasa al pastor." action={firmar.bind(null, c.id, "SUPERVISOR")}>
                            <Signature /> Firmar
                          </ActionButton>
                        )}
                        {enFirma && esAdmin && c.firmaSupervisorAt && !c.firmaPastorAt && (
                          <ActionButton size="sm" confirm="¿Firmar como pastor? Se generará y enviará el diploma PDF." successMessage="Certificado emitido" action={firmar.bind(null, c.id, "PASTOR")}>
                            <Signature /> Firmar y emitir
                          </ActionButton>
                        )}
                        {c.pdfPath && (
                          <Button size="icon-sm" variant="outline" asChild aria-label="Descargar">
                            <a href={`/api/archivos/certificado/${c.id}`} target="_blank" rel="noreferrer">
                              <Download />
                            </a>
                          </Button>
                        )}
                        {!c.pdfPath && c.linkExterno && (
                          <Button size="icon-sm" variant="outline" asChild aria-label="Ver en Drive">
                            <a href={c.linkExterno} target="_blank" rel="noreferrer">
                              <ExternalLink />
                            </a>
                          </Button>
                        )}
                        {esAdmin && c.estado !== "ANULADO" && (
                          <ActionButton size="icon-sm" variant="ghost" aria-label="Anular" confirm="¿Anular este certificado? El maestro podrá iniciarlo de nuevo." successMessage="Certificado anulado" action={anular.bind(null, c.id)}>
                            <Ban className="text-red-600" />
                          </ActionButton>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Panel>
    </>
  );
}

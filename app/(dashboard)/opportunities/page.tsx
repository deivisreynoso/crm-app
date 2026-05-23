"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { PageHeader, DataTableShell } from "@/components/ui/page-shell";
import { Card } from "@/components/ui/card";
import { PipelineBoard } from "@/components/opportunities/pipeline-board";
import { OpportunityListView } from "@/components/opportunities/opportunity-list-view";
import { SavedFiltersBar } from "@/components/filters/saved-filters-bar";
import { PipelineSettings } from "@/components/opportunities/pipeline-settings";
import { OpportunityForm } from "@/components/opportunities/opportunity-form";
import { NewPipelineForm } from "@/components/opportunities/new-pipeline-form";
import {
  usePipelines,
  useCreatePipeline,
  useUpdatePipeline,
  useDeletePipeline,
} from "@/hooks/usePipelines";
import {
  useOpportunities,
  useCreateOpportunity,
  useUpdateOpportunity,
  useMoveOpportunityStage,
  useDeleteOpportunity,
} from "@/hooks/useOpportunities";
import { DEFAULT_PIPELINE_STAGES } from "@/lib/constants/pipelines";
import { formatTagsForInput } from "@/lib/tags";
import type { OpportunityFormInput, OpportunityWithContact } from "@/types";

type Panel = "none" | "create" | "edit" | "pipeline" | "newPipeline";
type ViewMode = "board" | "list";

function apiErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const msg = err.response?.data as { error?: string } | undefined;
    return msg?.error ?? err.message;
  }
  return "Something went wrong. Please try again.";
}

export default function OpportunitiesPage() {
  const { data: pipelines = [], isLoading: pipelinesLoading } = usePipelines();
  const [selectedPipelineId, setSelectedPipelineId] = useState<string>("");
  const [panel, setPanel] = useState<Panel>("none");
  const [editingOpportunity, setEditingOpportunity] =
    useState<OpportunityWithContact | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [deletingOpportunity, setDeletingOpportunity] =
    useState<OpportunityWithContact | null>(null);
  const [deletingPipeline, setDeletingPipeline] = useState(false);
  const [pipelineError, setPipelineError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("board");
  const [stageFilter, setStageFilter] = useState("");
  const [searchFilter, setSearchFilter] = useState("");
  const [createdFrom, setCreatedFrom] = useState("");
  const [createdTo, setCreatedTo] = useState("");

  const selectedPipeline = pipelines.find((p) => p.id === selectedPipelineId);

  const { data: opportunities = [], isLoading: oppsLoading } = useOpportunities(
    selectedPipelineId || undefined,
    undefined,
    {
      ...(stageFilter ? { stage: stageFilter } : {}),
      ...(searchFilter ? { search: searchFilter } : {}),
      ...(createdFrom ? { createdFrom } : {}),
      ...(createdTo ? { createdTo } : {}),
    }
  );

  const createPipeline = useCreatePipeline();
  const updatePipeline = useUpdatePipeline(selectedPipelineId);
  const createOpportunity = useCreateOpportunity(selectedPipelineId);
  const updateOpportunity = useUpdateOpportunity(selectedPipelineId);
  const moveStage = useMoveOpportunityStage(selectedPipelineId);
  const deleteOpportunity = useDeleteOpportunity(selectedPipelineId);
  const deletePipeline = useDeletePipeline();

  useEffect(() => {
    if (pipelines.length && !selectedPipelineId) {
      setSelectedPipelineId(pipelines[0].id);
    }
  }, [pipelines, selectedPipelineId]);

  function closePanel() {
    setPanel("none");
    setEditingOpportunity(null);
    setSaveError(null);
    setDeletingPipeline(false);
  }

  function openPanel(next: Panel) {
    setSaveError(null);
    setPanel(next);
  }

  async function handleCreatePipeline(name: string) {
    const result = await createPipeline.mutateAsync({
      name,
      stages: DEFAULT_PIPELINE_STAGES,
    });
    setSelectedPipelineId(result.data.id);
    closePanel();
  }

  async function handleSavePipeline(input: {
    name: string;
    stages: typeof DEFAULT_PIPELINE_STAGES;
  }) {
    setPipelineError(null);
    await updatePipeline.mutateAsync(input);
    closePanel();
  }

  async function handleDeletePipeline() {
    if (!selectedPipelineId) return;
    setPipelineError(null);
    try {
      await deletePipeline.mutateAsync(selectedPipelineId);
      const remaining = pipelines.filter((p) => p.id !== selectedPipelineId);
      setSelectedPipelineId(remaining[0]?.id ?? "");
      setDeletingPipeline(false);
      closePanel();
    } catch (err) {
      setPipelineError(apiErrorMessage(err));
      setDeletingPipeline(false);
    }
  }

  async function handleCreateOpportunity(data: OpportunityFormInput) {
    try {
      await createOpportunity.mutateAsync(data);
      closePanel();
    } catch (err) {
      setSaveError(apiErrorMessage(err));
      throw err;
    }
  }

  async function handleUpdateOpportunity(data: OpportunityFormInput) {
    if (!editingOpportunity) return;
    try {
      await updateOpportunity.mutateAsync({
        id: editingOpportunity.id,
        data,
      });
      closePanel();
    } catch (err) {
      setSaveError(apiErrorMessage(err));
      throw err;
    }
  }

  function openEdit(opp: OpportunityWithContact) {
    setEditingOpportunity(opp);
    openPanel("edit");
  }

  async function handleMoveStage(id: string, stage: string) {
    try {
      await moveStage.mutateAsync({ id, stage });
    } catch (err) {
      alert(apiErrorMessage(err));
    }
  }

  function requestDelete(opp: OpportunityWithContact) {
    setDeletingOpportunity(opp);
  }

  async function confirmDelete() {
    if (!deletingOpportunity) return;
    try {
      await deleteOpportunity.mutateAsync(deletingOpportunity.id);
      if (editingOpportunity?.id === deletingOpportunity.id) {
        closePanel();
      }
      setDeletingOpportunity(null);
    } catch (err) {
      alert(apiErrorMessage(err));
    }
  }

  const totalValue = opportunities.reduce(
    (sum, o) => sum + (Number(o.value) || 0),
    0
  );

  const opportunityModalKey =
    panel === "edit" && editingOpportunity
      ? editingOpportunity.id
      : "create";

  return (
    <div className="space-y-4 w-full">
      <PageHeader
        title="Pipelines"
        description="Drag deals between stages on your pipeline board"
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => openPanel("pipeline")}
              disabled={!selectedPipeline}
            >
              Manage pipeline
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => openPanel("newPipeline")}
              disabled={createPipeline.isPending}
            >
              New pipeline
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setEditingOpportunity(null);
                openPanel("create");
              }}
              disabled={!selectedPipeline}
            >
              Add opportunity
            </Button>
          </>
        }
      />

      <Card padding="sm" className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-sm text-body-muted">Pipeline:</label>
          <select
            value={selectedPipelineId}
            onChange={(e) => setSelectedPipelineId(e.target.value)}
            className="input-field min-w-[180px]"
          >
            {pipelines.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <div className="flex rounded-lg border border-[var(--card-border)] overflow-hidden">
            <button
              type="button"
              onClick={() => setViewMode("board")}
              className={`px-3 py-1.5 text-sm ${viewMode === "board" ? "bg-[var(--primary)] text-[var(--primary-foreground)]" : "text-body-muted hover:bg-[var(--sidebar-hover)]"}`}
            >
              Board
            </button>
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={`px-3 py-1.5 text-sm ${viewMode === "list" ? "bg-[var(--primary)] text-[var(--primary-foreground)]" : "text-body-muted hover:bg-[var(--sidebar-hover)]"}`}
            >
              List
            </button>
          </div>
          <span className="text-sm text-body-muted">
            {opportunities.length} opportunities · ${totalValue.toLocaleString()}
          </span>
        </div>
        {viewMode === "list" && selectedPipeline && (
          <div className="flex flex-wrap gap-2 items-center pt-1 border-t border-[var(--card-border)]">
            <SavedFiltersBar
              entityType="opportunity"
              currentConfig={{
                ...(stageFilter ? { stage: stageFilter } : {}),
                ...(searchFilter ? { search: searchFilter } : {}),
                ...(createdFrom ? { created_from: createdFrom } : {}),
                ...(createdTo ? { created_to: createdTo } : {}),
              }}
              onApply={(config) => {
                setStageFilter(typeof config.stage === "string" ? config.stage : "");
                setSearchFilter(typeof config.search === "string" ? config.search : "");
                setCreatedFrom(
                  typeof config.created_from === "string" ? config.created_from : ""
                );
                setCreatedTo(
                  typeof config.created_to === "string" ? config.created_to : ""
                );
              }}
            />
            <input
              type="search"
              placeholder="Search title…"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="input-field min-w-[160px]"
            />
            <select
              value={stageFilter}
              onChange={(e) => setStageFilter(e.target.value)}
              className="input-field min-w-[140px]"
            >
              <option value="">All stages</option>
              {selectedPipeline.stages.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <input
              type="date"
              value={createdFrom}
              onChange={(e) => setCreatedFrom(e.target.value)}
              className="input-field"
              title="Created from"
            />
            <input
              type="date"
              value={createdTo}
              onChange={(e) => setCreatedTo(e.target.value)}
              className="input-field"
              title="Created to"
            />
          </div>
        )}
      </Card>

      <Modal
        open={panel === "pipeline" && !!selectedPipeline}
        onClose={closePanel}
        title="Pipeline settings"
      >
        {selectedPipeline && (
          <>
            {pipelineError && (
              <p className="mb-4 text-sm text-red-600 bg-red-50 border border-red-100 rounded-md px-3 py-2">
                {pipelineError}
              </p>
            )}
            <PipelineSettings
              pipelineName={selectedPipeline.name}
              stages={selectedPipeline.stages}
              onSave={handleSavePipeline}
              onDelete={async () => {
                setDeletingPipeline(true);
              }}
              onCancel={closePanel}
              isLoading={updatePipeline.isPending}
              isDeleting={deletePipeline.isPending}
              canDelete={pipelines.length > 1 && opportunities.length === 0}
              deleteBlockedReason={
                pipelines.length <= 1
                  ? "You must keep at least one pipeline."
                  : opportunities.length > 0
                    ? `Move or delete ${opportunities.length} opportunit${opportunities.length === 1 ? "y" : "ies"} on this pipeline first.`
                    : undefined
              }
            />
          </>
        )}
      </Modal>

      <Modal
        open={panel === "newPipeline"}
        onClose={closePanel}
        title="New pipeline"
      >
        <NewPipelineForm
          onSubmit={handleCreatePipeline}
          onCancel={closePanel}
          isLoading={createPipeline.isPending}
        />
      </Modal>

      <Modal
        open={(panel === "create" || panel === "edit") && !!selectedPipeline}
        onClose={closePanel}
        title={panel === "edit" ? "Edit opportunity" : "New opportunity"}
      >
        {selectedPipeline && (
          <>
            {saveError && (
              <p className="mb-4 text-sm text-red-600 bg-red-50 border border-red-100 rounded-md px-3 py-2">
                {saveError}
              </p>
            )}
            <OpportunityForm
              key={opportunityModalKey}
              pipelineId={selectedPipeline.id}
              stages={selectedPipeline.stages}
              initial={
                editingOpportunity
                  ? {
                      id: editingOpportunity.id,
                      contact_id: editingOpportunity.contact_id,
                      title: editingOpportunity.title,
                      value: editingOpportunity.value,
                      stage: editingOpportunity.stage,
                      probability: editingOpportunity.probability,
                      notes: editingOpportunity.notes,
                      tags: formatTagsForInput(editingOpportunity.tags),
                      custom_fields: editingOpportunity.custom_fields,
                      currency: editingOpportunity.currency,
                    }
                  : undefined
              }
              onSubmit={
                panel === "edit"
                  ? handleUpdateOpportunity
                  : handleCreateOpportunity
              }
              onCancel={closePanel}
              isLoading={
                createOpportunity.isPending || updateOpportunity.isPending
              }
            />
          </>
        )}
      </Modal>

      <ConfirmDialog
        open={deletingPipeline}
        title="Delete pipeline?"
        description={
          selectedPipeline
            ? `"${selectedPipeline.name}" will be permanently removed. This cannot be undone.`
            : ""
        }
        confirmLabel="Delete pipeline"
        destructive
        loading={deletePipeline.isPending}
        onConfirm={handleDeletePipeline}
        onCancel={() => setDeletingPipeline(false)}
      />

      <ConfirmDialog
        open={!!deletingOpportunity}
        title="Delete opportunity"
        description={
          deletingOpportunity
            ? `Remove "${deletingOpportunity.title}" from this pipeline? This cannot be undone.`
            : ""
        }
        confirmLabel="Delete"
        destructive
        loading={deleteOpportunity.isPending}
        onConfirm={confirmDelete}
        onCancel={() => setDeletingOpportunity(null)}
      />

      {pipelinesLoading || oppsLoading ? (
        <p className="text-body-muted">Loading…</p>
      ) : selectedPipeline ? (
        viewMode === "board" ? (
          <div className="surface-card p-4 overflow-x-auto">
            <PipelineBoard
              pipeline={selectedPipeline}
              opportunities={opportunities}
              onMoveStage={handleMoveStage}
              onEdit={openEdit}
              onDelete={requestDelete}
              deletingId={
                deleteOpportunity.isPending ? deletingOpportunity?.id ?? null : null
              }
            />
          </div>
        ) : (
          <DataTableShell>
            <OpportunityListView
              opportunities={opportunities}
              onEdit={openEdit}
              onDelete={requestDelete}
              deletingId={
                deleteOpportunity.isPending ? deletingOpportunity?.id ?? null : null
              }
            />
          </DataTableShell>
        )
      ) : (
        <p className="text-body-muted">No pipeline selected.</p>
      )}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { PageHeader } from "@/components/ui/page-shell";
import { Card } from "@/components/ui/card";
import { PipelineBoard } from "@/components/opportunities/pipeline-board";
import { PipelineSettings } from "@/components/opportunities/pipeline-settings";
import { OpportunityForm } from "@/components/opportunities/opportunity-form";
import { NewPipelineForm } from "@/components/opportunities/new-pipeline-form";
import {
  usePipelines,
  useCreatePipeline,
  useUpdatePipeline,
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

  const selectedPipeline = pipelines.find((p) => p.id === selectedPipelineId);

  const { data: opportunities = [], isLoading: oppsLoading } = useOpportunities(
    selectedPipelineId || undefined
  );

  const createPipeline = useCreatePipeline();
  const updatePipeline = useUpdatePipeline(selectedPipelineId);
  const createOpportunity = useCreateOpportunity(selectedPipelineId);
  const updateOpportunity = useUpdateOpportunity(selectedPipelineId);
  const moveStage = useMoveOpportunityStage(selectedPipelineId);
  const deleteOpportunity = useDeleteOpportunity(selectedPipelineId);

  useEffect(() => {
    if (pipelines.length && !selectedPipelineId) {
      setSelectedPipelineId(pipelines[0].id);
    }
  }, [pipelines, selectedPipelineId]);

  function closePanel() {
    setPanel("none");
    setEditingOpportunity(null);
    setSaveError(null);
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
    await updatePipeline.mutateAsync(input);
    closePanel();
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

      <Card padding="sm" className="flex flex-wrap items-center gap-3">
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
        <span className="text-sm text-body-muted">
          {opportunities.length} opportunities · ${totalValue.toLocaleString()}
        </span>
      </Card>

      <Modal
        open={panel === "pipeline" && !!selectedPipeline}
        onClose={closePanel}
        title="Pipeline settings"
      >
        {selectedPipeline && (
          <PipelineSettings
            pipelineName={selectedPipeline.name}
            stages={selectedPipeline.stages}
            onSave={handleSavePipeline}
            onCancel={closePanel}
            isLoading={updatePipeline.isPending}
          />
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
        <p className="text-body-muted">No pipeline selected.</p>
      )}
    </div>
  );
}

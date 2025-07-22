import React, { useState } from "react";
import { IteratingExperiment } from "@/types/iterating";
import { iteratingExperimentSchema } from "@/schemas/iterating";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";

interface IteratingExperimentFormProps {
  experiment: IteratingExperiment;
  onSubmit: (data: IteratingExperiment) => void;
  loading?: boolean;
}

const IteratingExperimentForm: React.FC<IteratingExperimentFormProps> = ({ experiment, onSubmit, loading }) => {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<IteratingExperiment>({
    resolver: zodResolver(iteratingExperimentSchema),
    defaultValues: experiment,
  });

  const userAction = watch("user_feedback_action");

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 bg-white p-4 rounded shadow border border-slate-200">
      <h2 className="font-bold text-lg text-blue-900 mb-2">Proposed Experiment</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="font-semibold text-slate-700">Summary</label>
          <Textarea {...register("proposed_experiment_summary")} className="mt-1" />
          {errors.proposed_experiment_summary && <span className="text-red-500 text-xs">{errors.proposed_experiment_summary.message}</span>}
        </div>
        <div>
          <label className="font-semibold text-slate-700">Hypothesis</label>
          <Textarea {...register("hypothesis")} className="mt-1" />
          {errors.hypothesis && <span className="text-red-500 text-xs">{errors.hypothesis.message}</span>}
        </div>
        <div>
          <label className="font-semibold text-slate-700">Validation Method</label>
          <Textarea {...register("validation_method")} className="mt-1" />
          {errors.validation_method && <span className="text-red-500 text-xs">{errors.validation_method.message}</span>}
        </div>
        <div>
          <label className="font-semibold text-slate-700">Success Metrics</label>
          <Textarea {...register("success_metrics")} className="mt-1" />
          {errors.success_metrics && <span className="text-red-500 text-xs">{errors.success_metrics.message}</span>}
        </div>
        <div>
          <label className="font-semibold text-slate-700">Timeline</label>
          <Input {...register("timeline")} className="mt-1" />
          {errors.timeline && <span className="text-red-500 text-xs">{errors.timeline.message}</span>}
        </div>
        <div>
          <label className="font-semibold text-slate-700">Rationale</label>
          <Textarea {...register("rationale")} className="mt-1" />
          {errors.rationale && <span className="text-red-500 text-xs">{errors.rationale.message}</span>}
        </div>
        <div>
          <label className="font-semibold text-slate-700">Next Steps</label>
          <Textarea {...register("next_steps")} className="mt-1" />
          {errors.next_steps && <span className="text-red-500 text-xs">{errors.next_steps.message}</span>}
        </div>
        <div>
          <label className="font-semibold text-slate-700">Your Action</label>
          <select {...register("user_feedback_action")} className="mt-1 w-full border rounded p-2">
            <option value="accept">Accept</option>
            <option value="edit">Edit</option>
            <option value="replace">Replace</option>
          </select>
          {errors.user_feedback_action && <span className="text-red-500 text-xs">{errors.user_feedback_action.message}</span>}
        </div>
        {(userAction === "edit" || userAction === "replace") && (
          <div className="md:col-span-2">
            <label className="font-semibold text-slate-700">Edited or Replacement Details</label>
            <Textarea {...register("edited_or_replacement_details")} className="mt-1" />
            {errors.edited_or_replacement_details && <span className="text-red-500 text-xs">{errors.edited_or_replacement_details.message}</span>}
          </div>
        )}
      </div>
      <Button type="submit" className="mt-4" disabled={loading}>
        {loading ? "Submitting..." : "Submit"}
      </Button>
    </form>
  );
};

export default IteratingExperimentForm; 
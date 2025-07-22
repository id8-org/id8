import { useQuery, useMutation } from "@tanstack/react-query";
import axios from "axios";

export function useLLMStage(stage: string) {
  return useQuery([stage], async () => {
    const { data } = await axios.get(`/api/llm/${stage}`);
    return data.validated;
  });
}

export function useRunLLMStage() {
  return useMutation(
    async ({ stage, prompt }: { stage: string; prompt: string }) => {
      const { data } = await axios.post(`/api/llm/${stage}`, { prompt });
      return data.validated;
    }
  );
}
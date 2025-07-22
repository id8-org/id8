import { create } from 'zustand';
import type { DeepDiveVersion } from '@/lib/api';

interface VersionCacheState {
  versions: {
    [ideaId: string]: {
      [versionNumber: number]: DeepDiveVersion;
    };
  };
  activeVersion: {
    [ideaId: string]: number | null;
  };
  setVersions: (ideaId: string, versions: DeepDiveVersion[]) => void;
  setActiveVersion: (ideaId: string, versionNumber: number) => void;
  getVersions: (ideaId: string) => DeepDiveVersion[];
  getActiveVersion: (ideaId: string) => DeepDiveVersion | undefined;
}

export const useVersionCache = create<VersionCacheState>((set, get) => ({
  versions: {},
  activeVersion: {},
  setVersions: (ideaId, versions) => set(state => ({
    versions: {
      ...state.versions,
      [ideaId]: Object.fromEntries(versions.map(v => [v.version_number, v]))
    }
  })),
  setActiveVersion: (ideaId, versionNumber) => set(state => ({
    activeVersion: {
      ...state.activeVersion,
      [ideaId]: versionNumber
    }
  })),
  getVersions: (ideaId) => {
    const v = get().versions[ideaId];
    return v ? Object.values(v) : [];
  },
  getActiveVersion: (ideaId) => {
    const v = get().versions[ideaId];
    const active = get().activeVersion[ideaId];
    return v && active ? v[active] : undefined;
  }
})); 
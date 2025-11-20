import { VideoProject, ChannelConfig } from "../types";
import { DEFAULT_CHANNELS, DEFAULT_GLOBAL_SYSTEM_PROMPT, AI_MODELS } from "../constants";
import { db } from "./firebase";
import { collection, getDocs, doc, setDoc, deleteDoc, getDoc } from "firebase/firestore";

const PROJECTS_KEY = 'content_os_projects';
const CHANNELS_KEY = 'content_os_channels';
const GLOBAL_PROMPT_KEY = 'content_os_global_system_prompt';
const PREFERRED_MODEL_KEY = 'content_os_preferred_model';

// Helper to check if we are using Firebase
const useFirebase = () => !!db;

export const StorageService = {
  // --- SETTINGS (Local only is fine for UI prefs) ---
  getPreferredModel: (): string => {
      return localStorage.getItem(PREFERRED_MODEL_KEY) || AI_MODELS.FLASH.id;
  },
  
  savePreferredModel: (modelId: string) => {
      localStorage.setItem(PREFERRED_MODEL_KEY, modelId);
  },

  // --- PROJECTS ---
  getProjects: async (): Promise<VideoProject[]> => {
    if (useFirebase()) {
      try {
        const querySnapshot = await getDocs(collection(db, "projects"));
        const projects: VideoProject[] = [];
        querySnapshot.forEach((doc) => {
          projects.push(doc.data() as VideoProject);
        });
        // Sort by date desc
        return projects.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      } catch (e) {
        console.error("Firebase read error", e);
        return [];
      }
    } else {
      // LocalStorage Fallback
      return new Promise((resolve) => {
        try {
          const data = localStorage.getItem(PROJECTS_KEY);
          resolve(data ? JSON.parse(data) : []);
        } catch (e) {
          resolve([]);
        }
      });
    }
  },

  saveProject: async (project: VideoProject): Promise<void> => {
    if (useFirebase()) {
        await setDoc(doc(db, "projects", project.id), project);
    } else {
        const projects = await StorageService.getProjects();
        const index = projects.findIndex(p => p.id === project.id);
        if (index >= 0) {
            projects[index] = project;
        } else {
            projects.unshift(project);
        }
        localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
    }
  },

  deleteProject: async (id: string): Promise<void> => {
      if (useFirebase()) {
          await deleteDoc(doc(db, "projects", id));
      } else {
          const projects = await StorageService.getProjects();
          const filtered = projects.filter(p => p.id !== id);
          localStorage.setItem(PROJECTS_KEY, JSON.stringify(filtered));
      }
  },

  // --- CHANNELS ---
  getChannels: async (): Promise<ChannelConfig[]> => {
    if (useFirebase()) {
        try {
            const querySnapshot = await getDocs(collection(db, "channels"));
            if (querySnapshot.empty) return DEFAULT_CHANNELS;
            
            const channels: ChannelConfig[] = [];
            querySnapshot.forEach((doc) => channels.push(doc.data() as ChannelConfig));
            return channels;
        } catch (e) { return DEFAULT_CHANNELS; }
    } else {
        return new Promise((resolve) => {
            try {
                const data = localStorage.getItem(CHANNELS_KEY);
                resolve(data ? JSON.parse(data) : DEFAULT_CHANNELS);
            } catch (e) {
                resolve(DEFAULT_CHANNELS);
            }
        });
    }
  },

  saveChannel: async (channel: ChannelConfig): Promise<void> => {
    if (useFirebase()) {
        await setDoc(doc(db, "channels", channel.id), channel);
    } else {
        const channels = await StorageService.getChannels();
        const index = channels.findIndex(c => c.id === channel.id);
        if (index >= 0) {
            channels[index] = channel;
        } else {
            channels.push(channel);
        }
        localStorage.setItem(CHANNELS_KEY, JSON.stringify(channels));
    }
  },

  deleteChannel: async (id: string): Promise<void> => {
    if (useFirebase()) {
        await deleteDoc(doc(db, "channels", id));
    } else {
        const channels = await StorageService.getChannels();
        const filtered = channels.filter(c => c.id !== id);
        localStorage.setItem(CHANNELS_KEY, JSON.stringify(filtered));
    }
  },

  // --- GLOBAL PROMPT ---
  getGlobalSystemPrompt: async (): Promise<string> => {
      if (useFirebase()) {
          try {
              const docRef = await getDoc(doc(db, "settings", "global_prompt"));
              if (docRef.exists()) {
                  return docRef.data().content;
              }
              return DEFAULT_GLOBAL_SYSTEM_PROMPT;
          } catch (e) { return DEFAULT_GLOBAL_SYSTEM_PROMPT; }
      } else {
          return new Promise((resolve) => {
             const data = localStorage.getItem(GLOBAL_PROMPT_KEY);
             resolve(data || DEFAULT_GLOBAL_SYSTEM_PROMPT);
          });
      }
  },

  saveGlobalSystemPrompt: async (prompt: string): Promise<void> => {
      if (useFirebase()) {
          await setDoc(doc(db, "settings", "global_prompt"), { content: prompt });
      } else {
          localStorage.setItem(GLOBAL_PROMPT_KEY, prompt);
      }
  }
};
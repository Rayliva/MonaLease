import { create } from "zustand";

type DrawingTool = "pencil" | "eraser";

interface UiState {
  userId: string;
  userName: string;
  brushColor: string;
  brushWidth: number;
  drawingTool: DrawingTool;
  setBrushColor: (color: string) => void;
  setBrushWidth: (width: number) => void;
  setDrawingTool: (tool: DrawingTool) => void;
  setUser: (id: string, name: string) => void;
}

function getOrCreateUserId(): string {
  let id = sessionStorage.getItem("carousel-user-id");
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem("carousel-user-id", id);
  }
  return id;
}

function getOrCreateUserName(): string {
  return (
    sessionStorage.getItem("carousel-user-name") ??
    `Player-${Math.random().toString(36).slice(2, 6)}`
  );
}

export const useUiStore = create<UiState>((set) => ({
  userId: getOrCreateUserId(),
  userName: getOrCreateUserName(),
  brushColor: "#000000",
  brushWidth: 3,
  drawingTool: "pencil",
  setBrushColor: (color) => set({ brushColor: color }),
  setBrushWidth: (width) => set({ brushWidth: width }),
  setDrawingTool: (tool) => set({ drawingTool: tool }),
  setUser: (id, name) => {
    sessionStorage.setItem("carousel-user-id", id);
    sessionStorage.setItem("carousel-user-name", name);
    set({ userId: id, userName: name });
  },
}));

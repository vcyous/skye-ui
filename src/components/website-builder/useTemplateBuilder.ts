import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import type { CatalogConfig } from "../../services/api";
import {
  activateTemplate,
  DEFAULT_CATALOG_CONFIG,
  getActiveTheme,
  saveThemeConfig,
} from "../../services/api";
import { templateRegistry } from "./templateRegistry";

const ACTION = {
  SELECT_TEMPLATE: "SELECT_TEMPLATE",
  SET_VIEW_MODE: "SET_VIEW_MODE",
  UPDATE_TEXT: "UPDATE_TEXT",
  UPDATE_COLOR: "UPDATE_COLOR",
  UPDATE_IMAGE: "UPDATE_IMAGE",
  UPDATE_CATALOG: "UPDATE_CATALOG",
  RESET_CONFIG: "RESET_CONFIG",
  LOAD_FROM_DB: "LOAD_FROM_DB",
} as const;

type ActionType = (typeof ACTION)[keyof typeof ACTION];

interface BuilderConfig {
  texts: Record<string, string>;
  colors: Record<string, string>;
  images: Record<string, string>;
  catalog: CatalogConfig;
}

interface BuilderState {
  selectedTemplateId: string;
  viewMode: "desktop" | "mobile";
  config: BuilderConfig;
}

function getDefaultConfig(templateId: string): BuilderConfig {
  const entry = templateRegistry.find((t) => t.id === templateId);
  if (!entry)
    return {
      texts: {},
      colors: {},
      images: {},
      catalog: DEFAULT_CATALOG_CONFIG,
    };
  const texts: Record<string, string> = {};
  const colors: Record<string, string> = {};
  Object.entries(entry.defaultConfig.texts).forEach(([k, v]) => {
    if (v !== undefined) texts[k] = v;
  });
  Object.entries(entry.defaultConfig.colors).forEach(([k, v]) => {
    if (v !== undefined) colors[k] = v;
  });
  return { texts, colors, images: {}, catalog: DEFAULT_CATALOG_CONFIG };
}

const initialTemplateId = templateRegistry[0]?.id ?? "modern-minimal";

const initialState: BuilderState = {
  selectedTemplateId: initialTemplateId,
  viewMode: "desktop",
  config: getDefaultConfig(initialTemplateId),
};

function builderReducer(
  state: BuilderState,
  action: { type: ActionType; payload?: any },
): BuilderState {
  switch (action.type) {
    case ACTION.LOAD_FROM_DB: {
      const { templateSlug, config } = action.payload;
      return { ...state, selectedTemplateId: templateSlug, config };
    }
    case ACTION.SELECT_TEMPLATE: {
      const id = action.payload as string;
      if (id === state.selectedTemplateId) return state;
      return { ...state, selectedTemplateId: id, config: getDefaultConfig(id) };
    }
    case ACTION.SET_VIEW_MODE:
      return { ...state, viewMode: action.payload };
    case ACTION.UPDATE_TEXT:
      return {
        ...state,
        config: {
          ...state.config,
          texts: {
            ...state.config.texts,
            [action.payload.key]: action.payload.value,
          },
        },
      };
    case ACTION.UPDATE_COLOR:
      return {
        ...state,
        config: {
          ...state.config,
          colors: {
            ...state.config.colors,
            [action.payload.key]: action.payload.value,
          },
        },
      };
    case ACTION.UPDATE_IMAGE:
      return {
        ...state,
        config: {
          ...state.config,
          images: {
            ...state.config.images,
            [action.payload.key]: action.payload.value,
          },
        },
      };
    case ACTION.UPDATE_CATALOG:
      return {
        ...state,
        config: {
          ...state.config,
          catalog: { ...state.config.catalog, ...action.payload },
        },
      };
    case ACTION.RESET_CONFIG:
      return {
        ...state,
        config: {
          ...getDefaultConfig(state.selectedTemplateId),
          images: {},
          catalog: DEFAULT_CATALOG_CONFIG,
        },
      };
    default:
      return state;
  }
}

export function useTemplateBuilder() {
  const [state, dispatch] = useReducer(builderReducer, initialState);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeThemeId, setActiveThemeId] = useState<string | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirstLoad = useRef(true);

  // Load from DB on mount
  useEffect(() => {
    getActiveTheme()
      .then((theme) => {
        if (theme) {
          dispatch({ type: ACTION.LOAD_FROM_DB, payload: theme });
          setActiveThemeId(theme.id);
        }
      })
      .catch(() => {
        // Silently fall back to local defaults if DB unavailable
      })
      .finally(() => {
        setIsLoading(false);
        isFirstLoad.current = false;
      });
  }, []);

  // Debounced save on config change (skip on first load)
  useEffect(() => {
    if (isFirstLoad.current || !activeThemeId || isLoading) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    setIsSaving(true);
    saveTimerRef.current = setTimeout(async () => {
      try {
        await saveThemeConfig(activeThemeId, state.config);
      } finally {
        setIsSaving(false);
      }
    }, 500);
  }, [state.config, activeThemeId, isLoading]);

  const selectTemplate = useCallback(async (id: string) => {
    dispatch({ type: ACTION.SELECT_TEMPLATE, payload: id });
    try {
      await activateTemplate(id);
      // activeThemeId stays the same — same row, different template_slug + config
    } catch {
      // Template switch persisted locally even if DB call fails
    }
  }, []);

  const setViewMode = useCallback(
    (mode: "desktop" | "mobile") =>
      dispatch({ type: ACTION.SET_VIEW_MODE, payload: mode }),
    [],
  );

  const updateText = useCallback(
    (key: string, value: string) =>
      dispatch({ type: ACTION.UPDATE_TEXT, payload: { key, value } }),
    [],
  );

  const updateColor = useCallback(
    (key: string, value: string) =>
      dispatch({ type: ACTION.UPDATE_COLOR, payload: { key, value } }),
    [],
  );

  const updateImage = useCallback(
    (key: string, value: string) =>
      dispatch({ type: ACTION.UPDATE_IMAGE, payload: { key, value } }),
    [],
  );

  const updateCatalog = useCallback(
    (patch: Partial<CatalogConfig>) =>
      dispatch({ type: ACTION.UPDATE_CATALOG, payload: patch }),
    [],
  );

  const resetConfig = useCallback(
    () => dispatch({ type: ACTION.RESET_CONFIG }),
    [],
  );

  const activeTemplate = templateRegistry.find(
    (t) => t.id === state.selectedTemplateId,
  );

  return {
    state,
    activeTemplate,
    isLoading,
    isSaving,
    selectTemplate,
    setViewMode,
    updateText,
    updateColor,
    updateImage,
    updateCatalog,
    resetConfig,
  };
}

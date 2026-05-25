// @ts-nocheck
import { useReducer, useCallback } from "react";
import { templateRegistry } from "./templateRegistry.js";

/**
 * @typedef {'desktop' | 'mobile'} ViewMode
 *
 * @typedef {Object} BuilderConfig
 * @property {Record<string, string>} texts
 * @property {Record<string, string>} colors
 *
 * @typedef {Object} BuilderState
 * @property {string} selectedTemplateId
 * @property {ViewMode} viewMode
 * @property {BuilderConfig} config
 */

const ACTION = {
  SELECT_TEMPLATE: "SELECT_TEMPLATE",
  SET_VIEW_MODE: "SET_VIEW_MODE",
  UPDATE_TEXT: "UPDATE_TEXT",
  UPDATE_COLOR: "UPDATE_COLOR",
  RESET_CONFIG: "RESET_CONFIG",
};

function getDefaultConfig(templateId) {
  const entry = templateRegistry.find((t) => t.id === templateId);
  if (!entry) return { texts: {}, colors: {} };
  return {
    texts: { ...entry.defaultConfig.texts },
    colors: { ...entry.defaultConfig.colors },
  };
}

const initialTemplateId = templateRegistry[0]?.id || "modern-minimal";

/** @type {BuilderState} */
const initialState = {
  selectedTemplateId: initialTemplateId,
  viewMode: "desktop",
  config: getDefaultConfig(initialTemplateId),
};

/**
 * @param {BuilderState} state
 * @param {{ type: string, payload?: any }} action
 * @returns {BuilderState}
 */
function builderReducer(state, action) {
  switch (action.type) {
    case ACTION.SELECT_TEMPLATE: {
      const id = action.payload;
      if (id === state.selectedTemplateId) return state;
      return {
        ...state,
        selectedTemplateId: id,
        config: getDefaultConfig(id),
      };
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

    case ACTION.RESET_CONFIG:
      return {
        ...state,
        config: getDefaultConfig(state.selectedTemplateId),
      };

    default:
      return state;
  }
}

/**
 * Custom hook for the Website Template Builder.
 * Provides state and actions for template selection, view mode, and config editing.
 */
export function useTemplateBuilder() {
  const [state, dispatch] = useReducer(builderReducer, initialState);

  const selectTemplate = useCallback(
    (id) => dispatch({ type: ACTION.SELECT_TEMPLATE, payload: id }),
    [],
  );

  const setViewMode = useCallback(
    (mode) => dispatch({ type: ACTION.SET_VIEW_MODE, payload: mode }),
    [],
  );

  const updateText = useCallback(
    (key, value) =>
      dispatch({ type: ACTION.UPDATE_TEXT, payload: { key, value } }),
    [],
  );

  const updateColor = useCallback(
    (key, value) =>
      dispatch({ type: ACTION.UPDATE_COLOR, payload: { key, value } }),
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
    selectTemplate,
    setViewMode,
    updateText,
    updateColor,
    resetConfig,
  };
}
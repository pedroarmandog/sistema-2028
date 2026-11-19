import { api, setCSRF } from "./api.js";
export const state = {
  me: null,
  active: null,
  cache: new Map(),
  route: "",
  sequence: 0,
};
export async function refresh() {
  state.me = await api("/session");
  setCSRF(state.me.csrf);
  if (!state.me.profiles.some((p) => p.id === state.active))
    state.active = state.me.profiles[0]?.id;
  return state.me;
}
export function rerender() {
  window.dispatchEvent(new Event("community:refresh"));
}

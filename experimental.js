// New experiments are opt-in, including when loading older saved preferences.
export const EXPERIMENTAL_FEATURES=[{id:'dragging',name:'Dragging notes'}];
export function resolveExperiments(saved){
return Object.fromEntries(EXPERIMENTAL_FEATURES.map(feature=>[feature.id,saved?.[feature.id]===true]));
}
